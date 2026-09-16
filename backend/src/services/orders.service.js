// src/services/orders.service.js
import { pool } from '../config/db.js';
import { calcularCostoEnvioMultiorigen, calcularDistanciaKM } from './ai.service.js';
import { validarLocalDisponibleParaPedido } from './locales.service.js';
import { crearPreferenciaMercadoPago } from './mercadopago.service.js';
import { evaluarEstadoDocumentación } from './admin.service.js';

const RADIO_MAXIMO_COBERTURA_KM = 5.0; // 📏 Cobertura máxima configurable (5 km)

export const createOrderService = async (data) => {
  // 1️⃣ Recibir datos de la petición (incluyendo IDdireccion y ubicacionPersonalizada)
  const { IDcliente, productos, IDmetodo_pago, IDdireccion, ubicacionPersonalizada } = data;

  if (!IDcliente || !productos || productos.length === 0) {
    throw new Error('Datos incompletos para crear la orden');
  }

  // Validar método de pago predeterminado (1: Efectivo)
  const metodoPagoId = IDmetodo_pago ? Number(IDmetodo_pago) : 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 📍 2️⃣ Determinar la dirección y coordenadas exactas de entrega
    let clienteLat, clienteLng, direccionTexto = '';

    if (IDdireccion) {
      const [[dir]] = await conn.query(
        `SELECT direccion, latitud, longitud FROM direcciones_cliente WHERE id = ? AND IDusuario = ?`,
        [IDdireccion, IDcliente]
      );
      if (!dir) throw new Error('La dirección seleccionada no es válida');
      clienteLat = Number(dir.latitud);
      clienteLng = Number(dir.longitud);
      direccionTexto = dir.direccion;
    } else if (ubicacionPersonalizada?.latitud && ubicacionPersonalizada?.longitud) {
      clienteLat = Number(ubicacionPersonalizada.latitud);
      clienteLng = Number(ubicacionPersonalizada.longitud);
      direccionTexto = ubicacionPersonalizada.direccion || 'Ubicación seleccionada en mapa';
    } else {
      // Dirección principal de fallback
      const [[dirDef]] = await conn.query(
        `SELECT direccion, latitud, longitud FROM direcciones_cliente WHERE IDusuario = ? AND es_principal = 1 LIMIT 1`,
        [IDcliente]
      );
      clienteLat = dirDef ? Number(dirDef.latitud) : -32.40800000;
      clienteLng = dirDef ? Number(dirDef.longitud) : -63.24100000;
      direccionTexto = dirDef?.direccion || 'Sin dirección asignada';
    }

    // 🕒 Y 📏 3️⃣ VALIDACIÓN DE HORARIOS/ESTADO Y COBERTURA DE RADIO DE LOCALES
    const localesValidados = new Set();

    for (const item of productos) {
      const [[productoDB]] = await conn.query(
        `SELECT p.IDlocal, l.nombre AS local_nombre, l.latitud, l.longitud 
         FROM productos p 
         JOIN locales l ON p.IDlocal = l.id 
         WHERE p.id = ?`,
        [item.IDproducto]
      );

      if (!productoDB) {
        throw new Error(`Producto con ID ${item.IDproducto} no encontrado`);
      }

      if (!localesValidados.has(productoDB.IDlocal)) {
        await validarLocalDisponibleParaPedido(productoDB.IDlocal);
        localesValidados.add(productoDB.IDlocal);
      }

      // Validar Cobertura / Distancia al punto de entrega resuelto
      const distanciaAlCliente = calcularDistanciaKM(
        Number(productoDB.latitud),
        Number(productoDB.longitud),
        clienteLat,
        clienteLng
      );

      if (distanciaAlCliente > RADIO_MAXIMO_COBERTURA_KM) {
        throw new Error(
          `El local "${productoDB.local_nombre}" está a ${distanciaAlCliente.toFixed(2)} km, lo cual supera el radio máximo de cobertura permitido (${RADIO_MAXIMO_COBERTURA_KM} km).`
        );
      }
    }

    // 🎲 Generar código OTP aleatorio de 4 dígitos
    const codigoOTP = Math.floor(1000 + Math.random() * 9000).toString();

    // 4️⃣ Crear la orden guardando los datos de la dirección elegida
    const [orderResult] = await conn.query(
      `
      INSERT INTO ordenes 
      (IDcliente, IDdireccion, direccion_entrega, latitud_entrega, longitud_entrega, IDrepartidor, IDestado, precio, costo_envio, total, codigo_otp)
      VALUES (?, ?, ?, ?, ?, NULL, 1, 0, 0, 0, ?)
      `,
      [IDcliente, IDdireccion || null, direccionTexto, clienteLat, clienteLng, codigoOTP]
    );

    const IDorden = orderResult.insertId;

    // Historial de estado inicial
    await conn.query(
      `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, 1)`,
      [IDorden]
    );

    let subtotalProductos = 0;
    let maxTiempoPreparacion = 0;
    const localesAtendidosMap = new Map();
    const productosDetalleRespuesta = [];

    // 5️⃣ Procesar ítems, calcular adicionales, tiempo máximo y guardar en detalle_orden
    for (const item of productos) {
      const [rows] = await conn.query(
        `
        SELECT p.nombre, p.precio, p.tiempo_preparacion_min, p.IDlocal, l.latitud, l.longitud
        FROM productos p
        JOIN locales l ON p.IDlocal = l.id
        WHERE p.id = ?
        `,
        [item.IDproducto]
      );

      const productoDB = rows[0];
      const precioBase = Number(productoDB.precio);
      const IDlocal = productoDB.IDlocal;
      const tiempoBase = productoDB.tiempo_preparacion_min || 15;

      const IDsOpcionesEntrada = Array.isArray(item.opciones) ? item.opciones : [];

      const opcionesNormalizadas = IDsOpcionesEntrada.map(op => {
        if (typeof op === 'object' && op !== null) {
          return { id: Number(op.id), cantidad: Number(op.cantidad) || 1 };
        }
        return { id: Number(op), cantidad: 1 };
      });

      const arrayIdsOnly = opcionesNormalizadas.map(op => op.id);

      let montoAdicionalesItem = 0;
      let opcionesDetalle = [];

      if (arrayIdsOnly.length > 0) {
        const [rowsOpciones] = await conn.query(
          `SELECT id, nombre, precio_adicional FROM opciones_producto WHERE id IN (?)`,
          [arrayIdsOnly]
        );

        opcionesDetalle = rowsOpciones.map(op => {
          const coincidencia = opcionesNormalizadas.find(n => n.id === op.id);
          const cantOp = coincidencia ? coincidencia.cantidad : 1;
          return {
            ...op,
            cantidad: cantOp
          };
        });

        montoAdicionalesItem = opcionesDetalle.reduce(
          (acc, op) => acc + (Number(op.precio_adicional) * op.cantidad),
          0
        );
      }

      const precioUnitarioFinal = precioBase + montoAdicionalesItem;
      const subtotalItem = precioUnitarioFinal * item.cantidad;

      const tiempoTotalItem = item.cantidad > 1
        ? tiempoBase + ((item.cantidad - 1) * 3)
        : tiempoBase;

      if (tiempoTotalItem > maxTiempoPreparacion) {
        maxTiempoPreparacion = tiempoTotalItem;
      }

      subtotalProductos += subtotalItem;

      if (!localesAtendidosMap.has(IDlocal)) {
        localesAtendidosMap.set(IDlocal, {
          latitud: Number(productoDB.latitud),
          longitud: Number(productoDB.longitud)
        });
      }

      const comentarioItem = item.comentario ? String(item.comentario).trim() : null;

      const [detalleResult] = await conn.query(
        `
          INSERT INTO detalle_orden
          (IDorden, IDproducto, IDlocal, cantidad, precio_unitario, comentario, IDestado)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [IDorden, item.IDproducto, IDlocal, item.cantidad, precioUnitarioFinal, comentarioItem]
      );

      const IDdetalle = detalleResult.insertId;

      for (const op of opcionesDetalle) {
        await conn.query(
          `INSERT INTO detalle_orden_opciones (detalle_orden_id, opcion_id, precio_adicional, cantidad)
           VALUES (?, ?, ?, ?)`,
          [IDdetalle, op.id, op.precio_adicional, op.cantidad]
        );
      }

      productosDetalleRespuesta.push({
        IDproducto: item.IDproducto,
        nombre: productoDB.nombre,
        cantidad: item.cantidad,
        precioBase,
        montoAdicionales: montoAdicionalesItem,
        precioUnitarioFinal,
        subtotalItem,
        opciones: opcionesDetalle
      });
    }

    // 6️⃣ Calcular Costo de Envío Dinámico y Distancia
    const puntosRuta = Array.from(localesAtendidosMap.values());
    puntosRuta.push({ latitud: clienteLat, longitud: clienteLng });

    const { distanciaTotalKM, costoEnvio } = calcularCostoEnvioMultiorigen(puntosRuta);
    const totalFinal = subtotalProductos + costoEnvio;

    const tiempoEstimadoViajeMin = Math.round((distanciaTotalKM * 2.5) + 5);
    const tiempoTotalEstimadoMin = maxTiempoPreparacion + tiempoEstimadoViajeMin;

    // 7️⃣ Actualizar precios, tiempos, DISTANCIA KM y MÉTODO DE PAGO en la orden
    await conn.query(
      `
      UPDATE ordenes 
      SET precio = ?, 
          costo_envio = ?, 
          total = ?, 
          tiempo_estimado_min = ?, 
          distancia_km = ?, 
          IDmetodo_pago = ?
      WHERE id = ?
      `,
      [subtotalProductos, costoEnvio, totalFinal, tiempoTotalEstimadoMin, distanciaTotalKM, metodoPagoId, IDorden]
    );

    // Confirmar cambios en la BD antes de llamar a servicios externos
    await conn.commit();

    // 🟢 8️⃣ Generar preferencia de Mercado Pago si el método es online (ID 2 o 3)
    let checkoutUrl = null;
    if (metodoPagoId === 2 || metodoPagoId === 3) {
      const mpRes = await crearPreferenciaMercadoPago({
        IDorden,
        totalFinal,
        productos: productosDetalleRespuesta,
        costoEnvio
      });

      // Obtener la URL devuelta por Mercado Pago
      checkoutUrl = mpRes.init_point || mpRes.sandbox_init_point;
    }

    // 9️⃣ Retornar respuesta estructurada
    return {
      IDorden,
      codigoOTP,
      direccionEntrega: direccionTexto,
      subtotalProductos,
      costoEnvio,
      totalFinal,
      distanciaEstimadaKM: distanciaTotalKM,
      IDmetodo_pago: metodoPagoId,
      checkoutUrl,
      localesInvolucrados: localesAtendidosMap.size,
      desgloseTiempo: {
        tiempoPreparacionMin: maxTiempoPreparacion,
        tiempoViajeMin: tiempoEstimadoViajeMin,
        tiempoTotalEstimadoMin: tiempoTotalEstimadoMin
      },
      productos: productosDetalleRespuesta,
      message: 'Orden creada exitosamente'
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// ❌ CANCELACIÓN DE PEDIDOS (Únicamente si estado = 1 "Creado")
export const cancelOrderService = async (IDorden, IDcliente, motivo) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Obtener orden y verificar pertenencia al cliente
    const [[orden]] = await conn.query(
      `SELECT IDestado, IDcliente FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );

    if (!orden) {
      throw new Error('La orden especificada no existe');
    }

    if (orden.IDcliente !== IDcliente) {
      throw new Error('Acción denegada: Esta orden no pertenece a tu usuario');
    }

    // ⛔ VALIDACIÓN DE ESTADO: Solo se permite cancelar si está en estado 1 (Creado)
    if (orden.IDestado !== 1) {
      throw new Error(
        `No se puede cancelar la orden. El pedido ya ha avanzado en su procesamiento (Estado actual ID: ${orden.IDestado}).`
      );
    }

    const ESTADO_CANCELADO_ID = 6; // Estado 'Cancelado'
    const motivoCancelacion = motivo ? String(motivo).trim() : 'Cancelado por el cliente';

    // 2️⃣ Actualizar estado de la orden general y el motivo de cancelación
    await conn.query(
      `
      UPDATE ordenes 
      SET IDestado = ?, motivo_cancelacion = ? 
      WHERE id = ?
      `,
      [ESTADO_CANCELADO_ID, motivoCancelacion, IDorden]
    );

    // 3️⃣ Actualizar estado de los productos en detalle_orden
    await conn.query(
      `UPDATE detalle_orden SET IDestado = ? WHERE IDorden = ?`,
      [ESTADO_CANCELADO_ID, IDorden]
    );

    // 4️⃣ Registrar el evento en el historial
    await conn.query(
      `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, ?)`,
      [IDorden, ESTADO_CANCELADO_ID]
    );

    await conn.commit();

    return {
      message: 'La orden fue cancelada exitosamente',
      IDorden,
      nuevoEstado: ESTADO_CANCELADO_ID,
      motivo_cancelacion: motivoCancelacion
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 🗺️ Secuencia cronológica real del ciclo de vida (ID -> Paso Cronológico)
const PASO_CRONOLOGICO = {
  1: 1, // Creado
  2: 2, // En progreso
  7: 3, // Listo para retiro (¡Ahora está antes que el reparto!)
  4: 4, // Repartidor asignado
  5: 5, // En camino
  3: 6, // Entregado
  6: 99 // Cancelado (Estado final/excepción)
};

// 🚴 Repartidor acepta la orden (con validación de concurrencia, estado del repartidor y límite de 1 orden activa)
export const assignRepartidorService = async (IDorden, IDusuario) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Obtener ID y estado del repartidor mediante el IDusuario
    const [[repartidor]] = await conn.query(
      `SELECT id, validado, disponible FROM repartidores WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!repartidor) {
      throw new Error('El usuario autenticado no está registrado como repartidor');
    }

    // ⛔ VALIDACIÓN: ¿Está validado por la Administradora?
    if (repartidor.validado !== 1) {
      throw new Error('Acción denegada: Tu cuenta de repartidor aún no ha sido validada por el administrador.');
    }

    // ⛔ VALIDACIÓN: ¿Está activo/disponible en el sistema?
    if (repartidor.disponible !== 1) {
      throw new Error('Acción denegada: Actualmente no estás marcado como disponible para tomar pedidos.');
    }

    // ⛔ VALIDACIÓN: Vehículo activo y documentos (Si NO es bicicleta, verificar vencimientos)
    const [[vehiculoActivo]] = await conn.query(
      `SELECT v.* 
       FROM vehiculos_repartidor v
       JOIN repartidores r ON r.IDvehiculo_activo = v.id
       WHERE r.IDusuario = ?`,
      [IDusuario]
    );

    if (!vehiculoActivo) {
      throw new Error('Debes seleccionar un vehículo activo para tomar pedidos.');
    }

    const esBicicleta = Number(vehiculoActivo.IDtipo_vehiculo) === 2;

    if (!esBicicleta) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fLicencia = vehiculoActivo.fecha_vencimiento_licencia ? new Date(vehiculoActivo.fecha_vencimiento_licencia) : null;
      const fSeguro = vehiculoActivo.fecha_vencimiento_seguro ? new Date(vehiculoActivo.fecha_vencimiento_seguro) : null;
      const fCedula = vehiculoActivo.fecha_vencimiento_cedula ? new Date(vehiculoActivo.fecha_vencimiento_cedula) : null;

      if (
        (fLicencia && fLicencia < hoy) ||
        (fSeguro && fSeguro < hoy) ||
        (fCedula && fCedula < hoy)
      ) {
        throw new Error('No puedes aceptar pedidos porque el vehículo activo posee documentación vencida.');
      }
    }

    const IDrepartidor = repartidor.id;

    // ⛔ NUEVA VALIDACIÓN: Límite de 1 pedido activo por repartidor
    // Verificamos si tiene ordenes asignadas en estados intermedios/activos (ej: ID 4: Asignado, ID 5: En camino)
    const [ordenesActivas] = await conn.query(
      `
      SELECT id FROM ordenes 
      WHERE IDrepartidor = ? 
        AND IDestado NOT IN (3, 6) -- Excluimos 3 (Entregado) y 6 (Cancelado)
      `,
      [IDrepartidor]
    );

    if (ordenesActivas.length > 0) {
      throw new Error(
        `Acción denegada: Ya tienes un pedido activo en curso (Orden #${ordenesActivas[0].id}). Debes entregarlo antes de tomar otro.`
      );
    }

    // 2️⃣ Bloquear la orden objetivo en la BD (FOR UPDATE)
    const [[ordenActual]] = await conn.query(
      `
      SELECT o.IDestado, o.IDrepartidor, e.orden AS ordenEstado
      FROM ordenes o
      JOIN estados e ON o.IDestado = e.id
      WHERE o.id = ?
      FOR UPDATE
      `,
      [IDorden]
    );

    if (!ordenActual) {
      throw new Error('La orden especificada no existe');
    }

    // ⛔ VALIDACIÓN: ¿La orden ya fue tomada por otro repartidor?
    if (ordenActual.IDrepartidor !== null) {
      throw new Error('Esta orden ya fue aceptada por otro repartidor y no está disponible');
    }

    // ⛔ VALIDACIÓN: La orden debe estar en "En progreso" (ordenEstado = 2)
    if (ordenActual.ordenEstado !== 2) {
      throw new Error('La orden no se encuentra en el estado adecuado para ser tomada');
    }

    // 3️⃣ Obtener ID del estado "Repartidor asignado" (ID: 4 en BD)
    const [[estadoAsignado]] = await conn.query(
      `SELECT id FROM estados WHERE id = 4 OR orden = 3 LIMIT 1`
    );

    if (!estadoAsignado) {
      throw new Error('Estado "Repartidor asignado" no encontrado');
    }

    // 4️⃣ Asignar repartidor y cambiar estado de la orden
    await conn.query(
      `
      UPDATE ordenes
      SET IDrepartidor = ?, IDestado = ?
      WHERE id = ?
      `,
      [IDrepartidor, estadoAsignado.id, IDorden]
    );

    // 5️⃣ Registrar en el historial
    await conn.query(
      `
      INSERT INTO hitorial_estado_orden (IDorden, IDestado)
      VALUES (?, ?)
      `,
      [IDorden, estadoAsignado.id]
    );

    await conn.commit();

    return {
      message: 'Orden aceptada con éxito',
      IDorden,
      IDrepartidor,
      IDestado: estadoAsignado.id
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 🚴 Servicio: Listar órdenes disponibles para repartidores
export const getAvailableOrdersService = async (IDusuario) => {
  const [[repartidor]] = await pool.query(
    `SELECT id, validado FROM repartidores WHERE IDusuario = ?`,
    [IDusuario]
  );

  if (!repartidor || repartidor.validado !== 1) {
    throw new Error('Cuenta no validada como repartidor');
  }

  const [orders] = await pool.query(
    `
    SELECT 
      o.id AS IDorden,
      o.precio AS subtotal,
      o.costo_envio,
      o.total,
      o.tiempo_estimado_min,
      c.direccion AS direccion_cliente
    FROM ordenes o
    JOIN clientes c ON o.IDcliente = c.IDusuario
    WHERE o.IDestado = 2 AND o.IDrepartidor IS NULL
    ORDER BY o.id DESC
    `
  );

  for (const orden of orders) {
    const [productos] = await pool.query(
      `
      SELECT 
        do.id AS IDdetalle,
        p.nombre AS producto,
        do.cantidad,
        do.IDestado AS IDestado_detalle,
        do.motivo_cancelacion AS motivo_rechazo
      FROM detalle_orden do
      JOIN productos p ON p.id = do.IDproducto
      WHERE do.IDorden = ?
      `,
      [orden.IDorden]
    );

    orden.productos = productos;
  }

  return orders;
};

// 🏪 Obtener pedidos asociados al local autenticado
export const getLocalOrdersService = async (IDusuario, estadoFilter = null) => {
  const conn = await pool.getConnection();
  try {
    // 1️⃣ Obtener el ID del local perteneciente al usuario logueado
    const [[local]] = await conn.query(
      `SELECT id FROM locales WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!local) {
      throw new Error('No existe un local asignado a este usuario');
    }

    const localId = local.id;

    // 2️⃣ Consultar cabeceras de órdenes que contengan productos de este local
    let queryOrders = `
      SELECT DISTINCT
        o.id AS IDorden,
        o.IDcliente,
        o.IDrepartidor,
        u.nombre AS cliente_nombre,
        u.apellido AS cliente_apellido,
        u.username AS cliente_username,
        c.telefono AS cliente_telefono,
        c.direccion AS cliente_direccion,
        c.piso AS cliente_piso,
        c.departamento AS cliente_depto,
        c.referencia AS cliente_referencia,
        o.IDestado,
        e.nombre AS estado_orden,
        o.total,
        o.precio AS subtotal,
        o.costo_envio,
        o.tiempo_estimado_min,
        mp.nombre AS metodo_pago,
        ep.nombre AS estado_pago,
        o.codigo_otp,
        o.motivo_cancelacion,
        h.creado_en AS fecha_creacion
      FROM ordenes o
      JOIN detalle_orden d ON o.id = d.IDorden
      JOIN usuarios u ON o.IDcliente = u.id
      LEFT JOIN clientes c ON u.id = c.IDusuario
      JOIN estados e ON o.IDestado = e.id
      LEFT JOIN metodos_pago mp ON o.IDmetodo_pago = mp.id
      LEFT JOIN estados_pago ep ON o.IDestado_pago = ep.id
      LEFT JOIN (
        SELECT IDorden, MIN(creado_en) AS creado_en
        FROM hitorial_estado_orden
        GROUP BY IDorden
      ) h ON o.id = h.IDorden
      WHERE d.IDlocal = ?
    `;

    const params = [localId];

    if (estadoFilter) {
      queryOrders += ` AND o.IDestado = ?`;
      params.push(estadoFilter);
    }

    queryOrders += ` ORDER BY o.id DESC`;

    const [ordenes] = await conn.query(queryOrders, params);

    if (ordenes.length === 0) {
      return [];
    }

    const orderIds = ordenes.map((o) => o.IDorden);

    // 3️⃣ Obtener todos los productos de las órdenes que pertenecen a este local
    const [detalles] = await conn.query(
      `
      SELECT
        d.id AS IDdetalle,
        d.IDorden,
        d.IDproducto,
        p.nombre AS producto,
        d.cantidad,
        d.precio_unitario,
        d.comentario,
        d.motivo_cancelacion AS motivo_rechazo,
        d.IDestado AS IDestado_detalle,
        ed.nombre AS estado_detalle
      FROM detalle_orden d
      JOIN productos p ON d.IDproducto = p.id
      JOIN estados ed ON d.IDestado = ed.id
      WHERE d.IDlocal = ? AND d.IDorden IN (?)
      `,
      [localId, orderIds]
    );

    const detalleIds = detalles.map((d) => d.IDdetalle);

    // 4️⃣ Obtener opciones/adicionales de los ítems
    let opcionesMap = {};
    if (detalleIds.length > 0) {
      const [opciones] = await conn.query(
        `
    SELECT
      doo.detalle_orden_id,
      op.id AS opcion_id,
      op.nombre,
      doo.precio_adicional,
      doo.cantidad              -- 👈 Agregar el campo cantidad de la opción
    FROM detalle_orden_opciones doo
    JOIN opciones_producto op ON doo.opcion_id = op.id
    WHERE doo.detalle_orden_id IN (?)
    `,
        [detalleIds]
      );

      opciones.forEach((op) => {
        if (!opcionesMap[op.detalle_orden_id]) {
          opcionesMap[op.detalle_orden_id] = [];
        }
        opcionesMap[op.detalle_orden_id].push({
          id: op.opcion_id,
          nombre: op.nombre,
          precio_adicional: op.precio_adicional,
          cantidad: op.cantidad || 1 // 👈 Mapear la cantidad
        });
      });
    }

    // 5️⃣ Estructurar la respuesta
    const productosPorOrden = {};
    detalles.forEach((det) => {
      if (!productosPorOrden[det.IDorden]) {
        productosPorOrden[det.IDorden] = [];
      }
      productosPorOrden[det.IDorden].push({
        ...det,
        opciones: opcionesMap[det.IDdetalle] || []
      });
    });

    return ordenes.map((orden) => ({
      ...orden,
      productos: productosPorOrden[orden.IDorden] || []
    }));
  } finally {
    conn.release();
  }
};

// 🏪 Actualizar el estado de una orden por parte del Local
export const updateLocalItemStatusService = async (IDorden, IDusuario, nuevoEstadoId, detallesIds = [], motivo = null) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Obtener el local asociado al usuario autenticado
    const [[local]] = await conn.query(
      `SELECT id FROM locales WHERE IDusuario = ?`,
      [IDusuario]
    );
    if (!local) throw new Error('No existe un local asociado a este usuario');

    // 2️⃣ Obtener los ítems del detalle pertenecientes a este local
    const [detalles] = await conn.query(
      `SELECT id, IDestado FROM detalle_orden WHERE IDorden = ? AND IDlocal = ?`,
      [IDorden, local.id]
    );
    if (detalles.length === 0) {
      throw new Error('La orden no pertenece a este local o no fue encontrada');
    }

    // Impedir modificaciones sobre productos previamente cancelados/rechazados (IDestado = 6)
    const detallesCancelados = detalles.filter(d => Number(d.IDestado) === 6);
    if (detallesCancelados.length > 0 && detallesIds.some(id => detallesCancelados.map(d => d.id).includes(Number(id)))) {
      throw new Error('No se pueden modificar productos que ya fueron cancelados o rechazados.');
    }

    // Bloquear la cabecera del pedido para actualización concurrente
    const [[ordenActual]] = await conn.query(
      `SELECT IDestado, IDrepartidor, latitud_entrega, longitud_entrega FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );
    if (!ordenActual) throw new Error('La orden no existe');

    const targetDetallesIds = detallesIds.length > 0
      ? detallesIds
      : detalles.map(d => d.id);

    // 3️⃣ Actualizar los ítems en `detalle_orden`
    if (Number(nuevoEstadoId) === 6) {
      await conn.query(
        `UPDATE detalle_orden 
         SET IDestado = ?, motivo_cancelacion = ? 
         WHERE IDorden = ? AND IDlocal = ? AND id IN (?)`,
        [nuevoEstadoId, motivo ? String(motivo).trim() : 'Rechazado por el local', IDorden, local.id, targetDetallesIds]
      );
    } else {
      await conn.query(
        `UPDATE detalle_orden SET IDestado = ? WHERE IDorden = ? AND IDlocal = ? AND id IN (?)`,
        [nuevoEstadoId, IDorden, local.id, targetDetallesIds]
      );
    }

    // 4️⃣ Consultar el estado actualizado de todos los productos del pedido
    const [todosDetalles] = await conn.query(
      `SELECT d.id, d.IDlocal, d.cantidad, d.precio_unitario, d.IDestado, l.latitud, l.longitud
       FROM detalle_orden d
       JOIN locales l ON d.IDlocal = l.id
       WHERE d.IDorden = ?`,
      [IDorden]
    );

    const todosCancelados = todosDetalles.every(d => Number(d.IDestado) === 6);

    if (todosCancelados) {
      // Si el 100% de los ítems fueron rechazados, la orden se cancela globalmente
      await conn.query(
        `UPDATE ordenes SET IDestado = 6, precio = 0, costo_envio = 0, total = 0, motivo_cancelacion = ? WHERE id = ?`,
        [motivo || 'Todos los ítems fueron rechazados por los locales', IDorden]
      );
      await conn.query(
        `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, 6)`,
        [IDorden]
      );
    } else {
      // 5️⃣ Recalcular Subtotal, Coordenadas y Costo de Envío con los ítems activos
      const detallesActivos = todosDetalles.filter(d => Number(d.IDestado) !== 6);

      let nuevoSubtotal = 0;
      const localesActivosMap = new Map();

      detallesActivos.forEach(item => {
        nuevoSubtotal += Number(item.precio_unitario) * Number(item.cantidad);
        if (!localesActivosMap.has(item.IDlocal)) {
          localesActivosMap.set(item.IDlocal, {
            latitud: Number(item.latitud),
            longitud: Number(item.longitud)
          });
        }
      });

      const puntosRuta = Array.from(localesActivosMap.values());
      puntosRuta.push({
        latitud: Number(ordenActual.latitud_entrega),
        longitud: Number(ordenActual.longitud_entrega)
      });

      const { distanciaTotalKM, costoEnvio } = calcularCostoEnvioMultiorigen(puntosRuta);
      const nuevoTotal = nuevoSubtotal + costoEnvio;

      // 6️⃣ REGLA DE NEGOCIO: Evaluación e Invariabilidad del Estado Global
      let nuevoEstadoOrden = Number(ordenActual.IDestado);

      // 🔒 SI EL PEDIDO YA INICIÓ EL RECORRIDO (5: En camino, 3: Entregado), SE CONSERVA EL ESTADO GLOBAL
      if (nuevoEstadoOrden === 5 || nuevoEstadoOrden === 3) {
        // No se altera `nuevoEstadoOrden`, garantizando la invariabilidad y persistencia de "En camino"
      } else {
        // Evaluación estándar previa a "En camino"
        const todosItemsListos = detallesActivos.every(d => Number(d.IDestado) === 7);

        if (todosItemsListos) {
          nuevoEstadoOrden = 7; // Listo para Retiro
        } else if (ordenActual.IDrepartidor !== null) {
          nuevoEstadoOrden = 4; // Repartidor Asignado
        } else {
          const [[estadoMenorAvance]] = await conn.query(
            `SELECT e.id AS IDestado
             FROM detalle_orden do
             JOIN estados e ON do.IDestado = e.id
             WHERE do.IDorden = ? AND do.IDestado != 6
             ORDER BY e.orden ASC
             LIMIT 1`,
            [IDorden]
          );
          nuevoEstadoOrden = estadoMenorAvance ? Number(estadoMenorAvance.IDestado) : nuevoEstadoOrden;
        }
      }

      // 7️⃣ Persistir cambios en la tabla 'ordenes'
      await conn.query(
        `UPDATE ordenes 
         SET IDestado = ?, precio = ?, costo_envio = ?, distancia_km = ?, total = ? 
         WHERE id = ?`,
        [nuevoEstadoOrden, nuevoSubtotal, costoEnvio, distanciaTotalKM, nuevoTotal, IDorden]
      );

      // Registrar en el historial únicamente si hubo un cambio real en la cabecera
      if (nuevoEstadoOrden !== Number(ordenActual.IDestado)) {
        await conn.query(
          `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, ?)`,
          [IDorden, nuevoEstadoOrden]
        );
      }
    }

    await conn.commit();
    return {
      message: 'Detalle de la orden actualizado correctamente.',
      IDorden,
      nuevoEstadoIdDetalle: nuevoEstadoId,
      estadoGlobalOrden: todosCancelados ? 6 : Number(ordenActual.IDestado)
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 🚴 Repartidor cambia manualmente el estado a "En camino" (ID: 5)
// src/services/orders.service.js
export const setOrderEnCaminoService = async (IDorden, IDusuario) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[repartidor]] = await conn.query(
      `SELECT id FROM repartidores WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!repartidor) {
      throw new Error('El usuario autenticado no está registrado como repartidor');
    }

    const [[orden]] = await conn.query(
      `SELECT IDestado, IDrepartidor FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );

    if (!orden) {
      throw new Error('La orden no existe');
    }

    if (orden.IDrepartidor !== repartidor.id) {
      throw new Error('Acción denegada: No eres el repartidor asignado a esta orden');
    }

    // Permite pasar a "En camino" (5) desde "Asignado" (4) o "Listo para retiro" (7)
    const estadosPermitidos = [4, 7];
    if (!estadosPermitidos.includes(Number(orden.IDestado))) {
      throw new Error('La orden debe estar en estado Asignado o Listo para retiro para iniciar el recorrido');
    }

    // Actualizar orden general a "En camino" (ID 5)
    await conn.query(`UPDATE ordenes SET IDestado = 5 WHERE id = ?`, [IDorden]);
    await conn.query(`INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, 5)`, [IDorden]);

    await conn.commit();

    return {
      message: 'La orden se encuentra EN CAMINO y la simulación/recorrido está iniciada.',
      IDorden,
      nuevoEstado: 5
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 🚴 Repartidor cambia manualmente el estado a "Entregado" (ID: 3)
export const setOrderEntregadoService = async (IDorden, IDusuario, codigoOTP) => {
  if (!codigoOTP) {
    throw new Error('Es obligatorio ingresar el código OTP de confirmación entregado por el cliente');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[repartidor]] = await conn.query(
      `SELECT id FROM repartidores WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!repartidor) {
      throw new Error('El usuario autenticado no está registrado como repartidor');
    }

    const [[orden]] = await conn.query(
      `SELECT IDestado, IDrepartidor, codigo_otp FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );

    if (!orden || orden.IDrepartidor !== repartidor.id) {
      throw new Error('Orden no válida o no asignada al repartidor');
    }

    const estadosPermitidosEntrega = [5, 7, 8];

    if (!estadosPermitidosEntrega.includes(Number(orden.IDestado))) {
      throw new Error('La orden no se encuentra en un estado válido para ser entregada.');
    }

    // Validar que TODOS los locales de la orden hayan sido confirmados como retirados
    const [[pendientes]] = await conn.query(
      `SELECT COUNT(*) AS sinRetirar 
       FROM detalle_orden 
       WHERE IDorden = ? AND IDestado != 8 AND IDestado != 6`,
      [IDorden]
    );

    if (pendientes.sinRetirar > 0) {
      throw new Error('Aún quedan productos en locales sin confirmar su retiro');
    }

    // Validar OTP
    if (String(orden.codigo_otp).trim() !== String(codigoOTP).trim()) {
      throw new Error('El código OTP ingresado es incorrecto.');
    }

    // Marcar orden completa como Entregada (ID 3)
    await conn.query(`UPDATE ordenes SET IDestado = 3 WHERE id = ?`, [IDorden]);
    await conn.query(`UPDATE detalle_orden SET IDestado = 3 WHERE IDorden = ? AND IDestado != 6`, [IDorden]);
    await conn.query(`INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, 3)`, [IDorden]);

    await conn.commit();

    return {
      message: 'La orden ha sido confirmada y marcada como ENTREGADA exitosamente',
      IDorden,
      nuevoEstado: 3
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 🛒 1. Obtener las órdenes del cliente con datos de tracking del repartidor
// src/services/orders.service.js
export const getMyOrdersService = async (IDcliente) => {
  // 1️⃣ Consulta principal de órdenes del cliente incluyendo los datos del repartidor si está asignado
  const [ordenes] = await pool.query(
    `SELECT 
        o.id AS IDorden, 
        o.precio AS subtotal, 
        o.costo_envio, 
        o.total, 
        o.tiempo_estimado_min, 
        o.codigo_otp, 
        o.IDestado, 
        e.nombre AS estado_orden, 
        o.creado_en,
        o.IDrepartidor,
        u_rep.nombre AS repartidor_nombre,
        u_rep.apellido AS repartidor_apellido,
        c_rep.telefono AS repartidor_telefono
     FROM ordenes o
     JOIN estados e ON o.IDestado = e.id
     LEFT JOIN repartidores r ON o.IDrepartidor = r.id
     LEFT JOIN usuarios u_rep ON r.IDusuario = u_rep.id
     LEFT JOIN clientes c_rep ON u_rep.id = c_rep.IDusuario
     WHERE o.IDcliente = ?
     ORDER BY 
       CASE 
         WHEN o.IDestado IN (3, 6) THEN 1 
         ELSE 0 
       END ASC,
       o.id DESC`,
    [IDcliente]
  );

  if (ordenes.length === 0) return [];

  // 2️⃣ Mapear productos, opciones y formatear el objeto del repartidor para cada orden
  for (const orden of ordenes) {
    // Estructuración de los datos del repartidor asignado
    orden.repartidor_asignado = orden.IDrepartidor !== null;
    orden.repartidor = orden.IDrepartidor ? {
      id: orden.IDrepartidor,
      nombre: orden.repartidor_nombre,
      apellido: orden.repartidor_apellido,
      telefono: orden.repartidor_telefono
    } : null;

    // Limpieza de propiedades auxiliares
    delete orden.repartidor_nombre;
    delete orden.repartidor_apellido;
    delete orden.repartidor_telefono;

    // Obtener los ítems con el estado individual de cada uno
    const [productos] = await pool.query(
      `SELECT do.id AS IDdetalle, do.IDproducto, p.nombre AS producto, do.cantidad, 
              do.precio_unitario, do.comentario, do.motivo_cancelacion AS motivo_rechazo, do.IDlocal, l.nombre AS local, 
              do.IDestado AS IDestado_item, e.nombre AS estado_item
       FROM detalle_orden do
       JOIN productos p ON do.IDproducto = p.id
       JOIN locales l ON do.IDlocal = l.id
       JOIN estados e ON do.IDestado = e.id
       WHERE do.IDorden = ?`,
      [orden.IDorden]
    );

    for (const prod of productos) {
      const [opciones] = await pool.query(
        `SELECT op.id, op.nombre, doo.precio_adicional, doo.cantidad
         FROM detalle_orden_opciones doo
         JOIN opciones_producto op ON doo.opcion_id = op.id
         WHERE doo.detalle_orden_id = ?`,
        [prod.IDdetalle]
      );
      prod.opciones = opciones;
    }

    orden.productos = productos;
  }

  return ordenes;
};

// 📍 2. Endpoint Dedicado: Tracking GPS en vivo para renderizar el mapa
export const getOrderTrackingService = async (IDorden, IDcliente) => {
  const [[orden]] = await pool.query(
    `
    SELECT 
      o.id AS IDorden,
      o.IDestado,
      e.nombre AS estado_orden,
      o.IDcliente,
      o.IDrepartidor,
      u_rep.nombre AS repartidor_nombre,
      u_rep.apellido AS repartidor_apellido,
      c_rep.telefono AS repartidor_telefono,
      r.latitud AS repartidor_latitud,
      r.longitud AS repartidor_longitud,
      r.ultima_ubicacion AS repartidor_ultima_ubicacion,
      o.latitud_entrega,
      o.longitud_entrega,
      o.direccion_entrega
    FROM ordenes o
    JOIN estados e ON o.IDestado = e.id
    LEFT JOIN repartidores r ON o.IDrepartidor = r.id
    LEFT JOIN usuarios u_rep ON r.IDusuario = u_rep.id
    LEFT JOIN clientes c_rep ON u_rep.id = c_rep.IDusuario
    WHERE o.id = ?
    `,
    [IDorden]
  );

  if (!orden) {
    throw new Error('La orden especificada no existe');
  }

  if (orden.IDcliente !== IDcliente) {
    throw new Error('Acción denegada: No tienes acceso al seguimiento de esta orden');
  }

  const tieneRepartidor = orden.IDrepartidor !== null;

  return {
    IDorden: orden.IDorden,
    IDestado: orden.IDestado,
    estado_orden: orden.estado_orden,
    repartidor_asignado: tieneRepartidor,
    repartidor: tieneRepartidor ? {
      id: orden.IDrepartidor,
      nombre: orden.repartidor_nombre,
      apellido: orden.repartidor_apellido,
      telefono: orden.repartidor_telefono,
      ubicacion: {
        latitud: orden.repartidor_latitud,
        longitud: orden.repartidor_longitud,
        ultima_ubicacion: orden.repartidor_ultima_ubicacion
      }
    } : null,
    destino_cliente: {
      direccion: orden.direccion_entrega,
      latitud: orden.latitud_entrega,
      longitud: orden.longitud_entrega
    }
  };
};

// ⭐️ Calificar Pedido por parte del Cliente (Solo si la orden está ENTREGADA - Estado 3)
export const rateOrderService = async (IDorden, IDcliente, puntaje) => {
  const puntajeNum = Number(puntaje);

  if (isNaN(puntajeNum) || puntajeNum < 1 || puntajeNum > 5) {
    throw new Error('El puntaje debe ser un número entero entre 1 y 5');
  }

  const [result] = await pool.query(
    `
    UPDATE ordenes 
    SET puntaje_cliente = ? 
    WHERE id = ? AND IDcliente = ? AND IDestado = 3
    `,
    [puntajeNum, IDorden, IDcliente]
  );

  if (result.affectedRows === 0) {
    throw new Error('No se pudo calificar la orden. Verifique que exista, le pertenezca y se encuentre en estado Entregado.');
  }

  return {
    message: 'Pedido calificado exitosamente',
    IDorden,
    puntaje: puntajeNum
  };
};

export const cotizarOrdenService = async (data) => {
  const { IDcliente, productos, IDdireccion, ubicacionPersonalizada } = data;

  if (!IDcliente || !productos || productos.length === 0) {
    throw new Error('Debes incluir productos para cotizar la orden.');
  }

  const conn = await pool.getConnection();
  try {
    let clienteLat, clienteLng;

    // 1️⃣ Obtención de coordenadas según selección
    if (IDdireccion) {
      const [[dirDB]] = await conn.query(
        `SELECT latitud, longitud FROM direcciones_cliente WHERE id = ? AND IDusuario = ?`,
        [IDdireccion, IDcliente]
      );
      if (dirDB) {
        clienteLat = dirDB.latitud;
        clienteLng = dirDB.longitud;
      }
    } else if (ubicacionPersonalizada?.latitud && ubicacionPersonalizada?.longitud) {
      clienteLat = ubicacionPersonalizada.latitud;
      clienteLng = ubicacionPersonalizada.longitud;
    } else {
      // Si no envía nada, toma la dirección principal de fallback
      const [[dirPrincipal]] = await conn.query(
        `SELECT latitud, longitud FROM direcciones_cliente WHERE IDusuario = ? AND es_principal = 1 LIMIT 1`,
        [IDcliente]
      );
      clienteLat = dirPrincipal?.latitud || -32.40800000;
      clienteLng = dirPrincipal?.longitud || -63.24100000;
    }

    let subtotalProductos = 0;
    const localesAtendidosMap = new Map();

    for (const item of productos) {
      const [[productoDB]] = await conn.query(
        `SELECT precio, IDlocal, l.latitud, l.longitud
         FROM productos p
         JOIN locales l ON p.IDlocal = l.id
         WHERE p.id = ?`,
        [item.IDproducto]
      );

      if (!productoDB) throw new Error(`Producto ID ${item.IDproducto} no encontrado`);

      let precioUnitarioTotal = Number(productoDB.precio);
      const IDsOpciones = Array.isArray(item.opciones) ? item.opciones : [];
      if (IDsOpciones.length > 0) {
        const [opcionesDB] = await conn.query(
          `SELECT SUM(precio_adicional) AS total_adicionales FROM opciones_producto WHERE id IN (?)`,
          [IDsOpciones]
        );
        precioUnitarioTotal += Number(opcionesDB[0]?.total_adicionales || 0);
      }

      subtotalProductos += precioUnitarioTotal * item.cantidad;

      if (!localesAtendidosMap.has(productoDB.IDlocal)) {
        localesAtendidosMap.set(productoDB.IDlocal, {
          latitud: Number(productoDB.latitud),
          longitud: Number(productoDB.longitud)
        });
      }
    }

    const puntosRuta = Array.from(localesAtendidosMap.values());
    puntosRuta.push({ latitud: Number(clienteLat), longitud: Number(clienteLng) });

    const { distanciaTotalKM, costoEnvio } = calcularCostoEnvioMultiorigen(puntosRuta);

    return {
      subtotalProductos,
      costoEnvio,
      distanciaTotalKM,
      totalFinal: subtotalProductos + costoEnvio
    };
  } finally {
    conn.release();
  }
};

export const getOrderByIdService = async (IDorden, IDcliente) => {
  // 1️⃣ Consulta con JOIN a repartidores y usuarios para extraer datos completos del repartidor
  const [[orden]] = await pool.query(
    `SELECT 
        o.id AS IDorden,
        o.IDcliente,
        o.IDrepartidor,
        o.IDmetodo_pago,
        o.direccion_entrega,
        o.latitud_entrega,
        o.longitud_entrega,
        o.precio AS subtotal,
        o.costo_envio,
        o.total,
        o.tiempo_estimado_min,
        o.distancia_km,
        o.codigo_otp,
        o.IDestado,
        e.nombre AS estado_orden,
        e.orden AS orden_secuencia,
        mp.nombre AS metodo_pago,
        ep.nombre AS estado_pago,
        o.motivo_cancelacion,
        o.puntaje_cliente,
        o.creado_en,
        u_rep.nombre AS repartidor_nombre,
        u_rep.apellido AS repartidor_apellido,
        c_rep.telefono AS repartidor_telefono
     FROM ordenes o
     JOIN estados e ON o.IDestado = e.id
     LEFT JOIN metodos_pago mp ON o.IDmetodo_pago = mp.id
     LEFT JOIN estados_pago ep ON o.IDestado_pago = ep.id
     LEFT JOIN repartidores r ON o.IDrepartidor = r.id
     LEFT JOIN usuarios u_rep ON r.IDusuario = u_rep.id
     LEFT JOIN clientes c_rep ON u_rep.id = c_rep.IDusuario
     WHERE o.id = ?`,
    [IDorden]
  );

  if (!orden) {
    throw new Error(`La orden ID #${IDorden} no existe.`);
  }

  if (orden.IDcliente !== IDcliente) {
    throw new Error('Acción denegada: No tienes permiso para ver esta orden.');
  }

  // 2️⃣ Obtener los productos con el estado individual de cada uno
  const [productos] = await pool.query(
    `SELECT do.id AS IDdetalle, do.IDproducto, p.nombre AS producto, do.cantidad, 
       do.precio_unitario, do.comentario, do.motivo_cancelacion AS motivo_rechazo, do.IDlocal, l.nombre AS local, 
       do.IDestado AS IDestado_item, e.nombre AS estado_item
     FROM detalle_orden do
     JOIN productos p ON do.IDproducto = p.id
     JOIN locales l ON do.IDlocal = l.id
     JOIN estados e ON do.IDestado = e.id
     WHERE do.IDorden = ?`,
    [IDorden]
  );

  for (const prod of productos) {
    const [opciones] = await pool.query(
      `SELECT op.id, op.nombre, doo.precio_adicional, doo.cantidad
       FROM detalle_orden_opciones doo
       JOIN opciones_producto op ON doo.opcion_id = op.id
       WHERE doo.detalle_orden_id = ?`,
      [prod.IDdetalle]
    );
    prod.opciones = opciones;
  }

  // Estructuración final con los datos del repartidor
  orden.repartidor_asignado = orden.IDrepartidor !== null;
  orden.repartidor = orden.IDrepartidor ? {
    id: orden.IDrepartidor,
    nombre: orden.repartidor_nombre,
    apellido: orden.repartidor_apellido,
    telefono: orden.repartidor_telefono
  } : null;

  delete orden.repartidor_nombre;
  delete orden.repartidor_apellido;
  delete orden.repartidor_telefono;

  orden.productos = productos;
  return orden;
};
// src/services/orders.service.js
export const getMisPedidosAsignadosService = async (IDusuario) => {
  const [[repartidor]] = await pool.query(
    `SELECT id FROM repartidores WHERE IDusuario = ?`,
    [IDusuario]
  );

  if (!repartidor) {
    throw new Error('El usuario no está registrado como repartidor');
  }

  const [orders] = await pool.query(
    `
    SELECT
      o.id AS IDorden,
      o.total,
      o.precio AS subtotal,
      o.costo_envio,
      o.IDestado,
      o.IDestado AS id_estado,
      e.nombre AS estado_orden,
      c.direccion AS direccion_cliente,
      c.telefono AS telefono_cliente       -- 👈 Teléfono del Cliente agregado
    FROM ordenes o
    JOIN estados e ON e.id = o.IDestado
    JOIN clientes c ON c.IDusuario = o.IDcliente
    WHERE o.IDrepartidor = ?
   AND o.IDestado IN (4, 5, 7, 8, 3)
   ORDER BY o.id DESC
    `,
    [repartidor.id]
  );

  for (const orden of orders) {
    const [productos] = await pool.query(
      `
      SELECT
        do.id AS IDdetalle,
        p.nombre AS producto,
        do.cantidad,
        do.IDestado AS IDestado_detalle,
        do.motivo_cancelacion AS motivo_rechazo,
        e2.nombre AS estado_detalle,
        l.nombre AS local,                  -- 👈 Datos del Local agregados
        l.telefono AS telefono_local        -- 👈 Teléfono del Local agregado
      FROM detalle_orden do
      JOIN productos p ON p.id = do.IDproducto
      JOIN estados e2 ON e2.id = do.IDestado
      LEFT JOIN locales l ON l.id = do.IDlocal
      WHERE do.IDorden = ?
      `,
      [orden.IDorden]
    );

    orden.productos = productos;
  }

  return orders;
};

// src/services/orders.service.js

export const getPedidoAsignadoService = async (IDorden, IDusuario) => {
  const [[repartidor]] = await pool.query(
    `SELECT id FROM repartidores WHERE IDusuario = ?`,
    [IDusuario]
  );

  if (!repartidor) {
    throw new Error('El usuario no está registrado como repartidor');
  }

  const [[orden]] = await pool.query(
    `
    SELECT
      o.id AS IDorden,
      o.IDcliente,
      o.IDrepartidor,
      o.IDestado,
      e.nombre AS estado_orden,
      o.precio AS subtotal,
      o.costo_envio,
      o.total,
      o.codigo_otp,
      c.direccion AS direccion_cliente,
      c.telefono AS telefono_cliente,
      c.latitud AS cliente_latitud,
      c.longitud AS cliente_longitud,
      r.latitud AS repartidor_latitud,
      r.longitud AS repartidor_longitud,
      r.ultima_ubicacion AS repartidor_ultima_ubicacion
    FROM ordenes o
    JOIN estados e ON e.id = o.IDestado
    JOIN clientes c ON c.IDusuario = o.IDcliente
    LEFT JOIN repartidores r ON r.id = o.IDrepartidor
    WHERE o.id = ?
      AND o.IDrepartidor = ?
    `,
    [IDorden, repartidor.id]
  );

  if (!orden) {
    throw new Error('El pedido no existe o no está asignado a este repartidor');
  }

  // 1️⃣ Obtener locales ORDENADOS por Nivel de Sensibilidad del Producto (Ascendente)
  // De menor sensibilidad (Ambiente/Normal) a mayor sensibilidad (Helado/Caliente/Frito)
  const [localesConsolidados] = await pool.query(
    `
    SELECT 
      l.id AS IDlocal,
      l.nombre AS local_nombre,
      l.direccion AS local_direccion,
      l.latitud,
      l.longitud,
      MAX(COALESCE(cp.nivel_sensibilidad, 1)) AS max_sensibilidad,
      IF(r.id IS NOT NULL, 1, 0) AS retirado,
      r.fecha_retiro
    FROM detalle_orden do
    JOIN locales l ON do.IDlocal = l.id
    JOIN productos p ON do.IDproducto = p.id
    LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
    LEFT JOIN retiros_locales_orden r ON r.IDorden = do.IDorden AND r.IDlocal = l.id
    WHERE do.IDorden = ? AND do.IDestado != 6 -- Excluir productos cancelados
    GROUP BY l.id, l.nombre, l.direccion, l.latitud, l.longitud, r.id, r.fecha_retiro
    ORDER BY retirado ASC, max_sensibilidad ASC, l.id ASC
    `,
    [IDorden]
  );

  // 2️⃣ Determinar la secuencia óptima y cuál es el local habilitado actualmente
  let proximoLocalHabilitadoEncontrado = false;

  const localesRutaEstructurados = localesConsolidados.map((loc, index) => {
    const esRetirado = Number(loc.retirado) === 1;
    let esElSiguienteAHabilitar = false;

    // El primer local no retirado en la lista ordenada por sensibilidad será el único habilitado
    if (!esRetirado && !proximoLocalHabilitadoEncontrado) {
      esElSiguienteAHabilitar = true;
      proximoLocalHabilitadoEncontrado = true;
    }

    return {
      ...loc,
      orden_parada: index + 1,
      retirado: esRetirado,
      habilitado_para_retiro: esElSiguienteAHabilitar
    };
  });

  orden.localesRuta = localesRutaEstructurados;

  // 3️⃣ Obtener el detalle de los productos ordenados también por la secuencia
  const [productos] = await pool.query(
    `
    SELECT
  d.id AS IDdetalle,
  d.IDproducto,
  p.nombre AS producto,
  d.cantidad,
  d.precio_unitario,
  d.comentario,
  d.IDestado AS IDestado_detalle,
  ed.nombre AS estado_detalle,
  l.id AS IDlocal,
  l.nombre AS local,
  l.telefono AS telefono_local,
  l.direccion AS direccion_local,
  l.latitud AS local_latitud,
  l.longitud AS local_longitud,
  COALESCE(cp.nivel_sensibilidad, 1) AS nivel_sensibilidad -- 👈 🟢 AGREGAR ESTA LÍNEA
  FROM detalle_orden d
  JOIN productos p ON p.id = d.IDproducto
  JOIN estados ed ON ed.id = d.IDestado
  JOIN locales l ON l.id = d.IDlocal
  LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id -- 👈 🟢 AGREGAR ESTA LÍNEA
  WHERE d.IDorden = ?
    `,
    [IDorden]
  );

  orden.productos = productos;

  return orden;
};

// 🧪 Simulación de Pago Exitoso (Modo Demo)
export const simularPagoExitosoService = async (IDorden) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Verificar si la orden existe
    const [[orden]] = await conn.query(
      `SELECT id, IDestado_pago FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );

    if (!orden) {
      throw new Error(`La orden ID #${IDorden} no existe.`);
    }

    // 2. Cambiar únicamente el estado de pago a 'Aprobado' (ID 2)
    await conn.query(
      `UPDATE ordenes SET IDestado_pago = 2 WHERE id = ?`,
      [IDorden]
    );

    await conn.commit();

    return {
      message: 'Pago simulado correctamente como APROBADO',
      IDorden: Number(IDorden),
      IDestado_pago: 2
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// Añadir al final de src/services/orders.service.js
export const searchLocalOrdersService = async (IDusuario, filtros = {}) => {
  const conn = await pool.getConnection();
  try {
    const [[local]] = await conn.query(
      `SELECT id FROM locales WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!local) {
      throw new Error('No existe un local asignado a este usuario');
    }

    const { busqueda, fechaInicio, fechaFin, estado } = filtros;

    let queryOrders = `
      SELECT DISTINCT
        o.id AS IDorden,
        o.IDcliente,
        o.IDrepartidor,
        u.nombre AS cliente_nombre,
        u.apellido AS cliente_apellido,
        u.username AS cliente_username,
        c.telefono AS cliente_telefono,
        c.direccion AS cliente_direccion,
        o.IDestado,
        e.nombre AS estado_orden,
        o.total,
        o.precio AS subtotal,
        o.costo_envio,
        o.tiempo_estimado_min,
        mp.nombre AS metodo_pago,
        ep.nombre AS estado_pago,
        o.codigo_otp,
        o.motivo_cancelacion,
        o.creado_en AS fecha_creacion
      FROM ordenes o
      JOIN detalle_orden d ON o.id = d.IDorden
      JOIN usuarios u ON o.IDcliente = u.id
      LEFT JOIN clientes c ON u.id = c.IDusuario
      JOIN estados e ON o.IDestado = e.id
      LEFT JOIN metodos_pago mp ON o.IDmetodo_pago = mp.id
      LEFT JOIN estados_pago ep ON o.IDestado_pago = ep.id
      WHERE d.IDlocal = ?
    `;

    const params = [local.id];

    // Filtro por término (ID exacto o Nombre parcial)
    if (busqueda && busqueda.trim() !== '') {
      const term = busqueda.trim();
      if (!isNaN(term)) {
        queryOrders += ` AND (
          o.id = ?
          OR u.username LIKE ?
          OR u.nombre LIKE ?
          OR u.apellido LIKE ?
          OR CONCAT_WS(' ', u.nombre, u.apellido) LIKE ?
        )`;
        params.push(
          Number(term),
          `%${term}%`,
          `%${term}%`,
          `%${term}%`,
          `%${term}%`
        );
      } else {
        queryOrders += ` AND (
          u.username LIKE ?
          OR u.nombre LIKE ?
          OR u.apellido LIKE ?
          OR CONCAT_WS(' ', u.nombre, u.apellido) LIKE ?
        )`;
        params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
      }
    }

    // Filtro por Estado
    if (estado && estado !== 'todos') {
      queryOrders += ` AND o.IDestado = ?`;
      params.push(estado);
    }

    // Filtro por Rango de Fechas
    if (fechaInicio) {
      queryOrders += ` AND o.creado_en >= ?`;
      params.push(`${fechaInicio} 00:00:00`);
    }
    if (fechaFin) {
      queryOrders += ` AND o.creado_en <= ?`;
      params.push(`${fechaFin} 23:59:59`);
    }

    queryOrders += ` ORDER BY o.id DESC LIMIT 100`;

    const [ordenes] = await conn.query(queryOrders, params);
    if (ordenes.length === 0) return [];

    const orderIds = ordenes.map((o) => o.IDorden);

    const [detalles] = await conn.query(
      `
      SELECT
        d.id AS IDdetalle,
        d.IDorden,
        d.IDproducto,
        p.nombre AS producto,
        d.cantidad,
        d.precio_unitario,
        d.comentario,
        d.motivo_cancelacion AS motivo_rechazo,
        d.IDestado AS IDestado_detalle,
        ed.nombre AS estado_detalle
      FROM detalle_orden d
      JOIN productos p ON d.IDproducto = p.id
      JOIN estados ed ON d.IDestado = ed.id
      WHERE d.IDlocal = ? AND d.IDorden IN (?)
      `,
      [local.id, orderIds]
    );

    const productosPorOrden = {};
    detalles.forEach((det) => {
      if (!productosPorOrden[det.IDorden]) productosPorOrden[det.IDorden] = [];
      productosPorOrden[det.IDorden].push(det);
    });

    return ordenes.map((orden) => ({
      ...orden,
      productos: productosPorOrden[orden.IDorden] || []
    }));
  } finally {
    conn.release();
  }
};

// 🚴 Repartidor libera/cancela la asignación de un pedido (sin cancelar la orden global)
export const liberarPedidoRepartidorService = async (IDorden, IDusuario, motivo) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Obtener el ID del repartidor
    const [[repartidor]] = await conn.query(
      `SELECT id FROM repartidores WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!repartidor) {
      throw new Error('El usuario autenticado no está registrado como repartidor.');
    }

    // 2️⃣ Obtener la orden y validar
    const [[orden]] = await conn.query(
      `SELECT id, IDestado, IDrepartidor FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );

    if (!orden) {
      throw new Error('La orden no existe.');
    }

    if (orden.IDrepartidor !== repartidor.id) {
      throw new Error('Acción denegada: No eres el repartidor asignado a esta orden.');
    }

    // Solo se permite liberar si está asignado (4) o listo para retirar (7), antes de pasar a "En camino" (5)
    if (Number(orden.IDestado) === 5) {
      throw new Error('No se puede cancelar la asignación cuando el pedido ya está "En camino".');
    }

    // 3️⃣ Determinar el estado anterior al que debe retornar la orden
    // Buscamos en el historial el último estado distinto a "Repartidor asignado" (4)
    const [[historialPrevio]] = await conn.query(
      `SELECT IDestado 
       FROM hitorial_estado_orden 
       WHERE IDorden = ? AND IDestado != 4 
       ORDER BY id DESC LIMIT 1`,
      [IDorden]
    );

    // Si no se encuentra un estado previo válido, se reestablece a "En preparación" (2)
    const estadoAnteriorId = historialPrevio ? Number(historialPrevio.IDestado) : 2;

    // 4️⃣ Desvincular al repartidor y restaurar el estado anterior
    await conn.query(
      `UPDATE ordenes 
       SET IDrepartidor = NULL, IDestado = ? 
       WHERE id = ?`,
      [estadoAnteriorId, IDorden]
    );

    // 5️⃣ Registrar el retorno de estado en el historial
    await conn.query(
      `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, ?)`,
      [IDorden, estadoAnteriorId]
    );

    await conn.commit();

    return {
      message: 'Pedido liberado con éxito. El pedido volvió a la lista de disponibles.',
      IDorden,
      nuevoEstado: estadoAnteriorId
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const confirmarRetiroLocalService = async (IDorden, IDusuario, IDlocal) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Obtener repartidor y ubicación
    const [[repartidor]] = await conn.query(
      `SELECT id, latitud, longitud FROM repartidores WHERE IDusuario = ?`,
      [IDusuario]
    );

    if (!repartidor) throw new Error('El usuario autenticado no está registrado como repartidor');
    if (repartidor.latitud === null || repartidor.longitud === null) {
      throw new Error('No se pudo determinar tu ubicación GPS actual.');
    }

    // 2️⃣ Obtener datos del local a retirar
    const [[local]] = await conn.query(
      `SELECT id, nombre, latitud, longitud FROM locales WHERE id = ?`,
      [IDlocal]
    );

    if (!local) throw new Error('El local especificado no existe.');

    // 3️⃣ Validar geofencing (100 metros)
    const distanciaKM = calcularDistanciaKM(
      Number(repartidor.latitud),
      Number(repartidor.longitud),
      Number(local.latitud),
      Number(local.longitud)
    );

    if (distanciaKM > 0.1) {
      const distanciaMetros = Math.round(distanciaKM * 1000);
      throw new Error(
        `Te encuentras a ${distanciaMetros}m del local "${local.nombre}". Debes estar a menos de 100m para confirmar.`
      );
    }

    // 4️⃣ Bloquear la orden y verificar asignación
    const [[orden]] = await conn.query(
      `SELECT IDestado, IDrepartidor FROM ordenes WHERE id = ? FOR UPDATE`,
      [IDorden]
    );

    if (!orden) throw new Error('La orden especificada no existe');
    if (orden.IDrepartidor !== repartidor.id) {
      throw new Error('Acción denegada: No eres el repartidor asignado a esta orden');
    }

    // 5️⃣ VALIDACIÓN DE ORDEN DE RUTA SEGÚN NIVEL DE SENSIBILIDAD
    // Obtenemos los locales pendientes de retiro ordenados secuencialmente por sensibilidad
    const [localesPendientesOrdenados] = await conn.query(
      `
  SELECT 
    l.id AS IDlocal,
    l.nombre AS local_nombre,
    MAX(IFNULL(cp.nivel_sensibilidad, 1)) AS max_sensibilidad
  FROM detalle_orden do
  JOIN productos p ON do.IDproducto = p.id
  LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
  JOIN locales l ON do.IDlocal = l.id
  LEFT JOIN retiros_locales_orden r ON r.IDorden = do.IDorden AND r.IDlocal = l.id
  WHERE do.IDorden = ? 
    AND do.IDestado != 6 -- Excluir cancelados
    AND r.id IS NULL      -- Excluir ya retirados
  GROUP BY l.id, l.nombre
  ORDER BY max_sensibilidad ASC, l.id ASC  -- 👈 CAMBIAR DE DESC A ASC
  `,
      [IDorden]
    );

    if (localesPendientesOrdenados.length > 0) {
      const proximoLocalRequerido = localesPendientesOrdenados[0];

      if (Number(proximoLocalRequerido.IDlocal) !== Number(IDlocal)) {
        throw new Error(
          `Secuencia de ruta incorrecta: Debes retirar primero en "${proximoLocalRequerido.local_nombre}" debido al nivel de sensibilidad de sus productos.`
        );
      }
    }

    // 6️⃣ Validar que los ítems del local estén listos
    const [detallesPendientes] = await conn.query(
      `SELECT id FROM detalle_orden 
       WHERE IDorden = ? AND IDlocal = ? AND IDestado NOT IN (7, 8, 6)`,
      [IDorden, IDlocal]
    );

    if (detallesPendientes.length > 0) {
      throw new Error('El pedido aún no está marcado como "Listo para retiro" por el local.');
    }

    const ESTADO_RETIRADO_ID = 8; // Retirado en Local

    // 7️⃣ Confirmar retiro de ítems
    await conn.query(
      `UPDATE detalle_orden SET IDestado = ? WHERE IDorden = ? AND IDlocal = ? AND IDestado != 6`,
      [ESTADO_RETIRADO_ID, IDorden, IDlocal]
    );

    // 8️⃣ Registrar el evento de retiro
    await conn.query(
      `INSERT INTO retiros_locales_orden (IDorden, IDlocal, IDrepartidor) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE fecha_retiro = CURRENT_TIMESTAMP`,
      [IDorden, IDlocal, repartidor.id]
    );

    // 9️⃣ Verificar si se completaron todos los retiros de la orden
    const [[pendientesGlobales]] = await conn.query(
      `SELECT COUNT(*) AS sinRetirar 
       FROM detalle_orden 
       WHERE IDorden = ? AND IDestado != 8 AND IDestado != 6`,
      [IDorden]
    );

    if (pendientesGlobales.sinRetirar === 0 && orden.IDestado !== ESTADO_RETIRADO_ID) {
      await conn.query(`UPDATE ordenes SET IDestado = ? WHERE id = ?`, [ESTADO_RETIRADO_ID, IDorden]);
      await conn.query(`INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, ?)`, [IDorden, ESTADO_RETIRADO_ID]);
    }

    await conn.commit();

    return {
      message: `¡Producto retirado con éxito de "${local.nombre}"!`,
      IDorden,
      IDlocal,
      retirado: true,
      retiroCompletoPedido: pendientesGlobales.sinRetirar === 0
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};