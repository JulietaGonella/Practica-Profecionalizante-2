import { pool } from '../config/db.js';
import { generarEtapasRuta } from './ai.service.js';

// 🛠️ Helper de logs estructurados con identificador de contexto
const createLoggerViaje = (IDrepartidor, IDorden) => {
  const prefijo = `[REP #${IDrepartidor} | ORD #${IDorden}]`;
  return {
    info: (msg) => console.log(`ℹ️  ${prefijo} ${msg}`),
    gps: (lat, lng) => console.log(`   📍 ${prefijo} GPS: (${lat}, ${lng})`),
    local: (msg) => console.log(`🏪 ${prefijo} ${msg}`),
    alerta: (msg) => console.log(`⚠️  ${prefijo} ${msg}`),
    éxito: (msg) => console.log(`   ✅ ${prefijo} ${msg}`),
    fin: (msg) => console.log(`\n🏁 ${prefijo} ${msg}\n`)
  };
};

export const simularRecorrido = async (req, res) => {
  try {
    const { id } = req.params;
    const { IDorden } = req.body;

    if (!IDorden) {
      return res.status(400).json({
        error: 'IDorden es requerido para simular el recorrido'
      });
    }

    const [[repartidor]] = await pool.query(
      `SELECT id FROM repartidores WHERE id = ? AND IDusuario = ?`,
      [id, req.user.id]
    );

    if (!repartidor) {
      return res.status(403).json({
        error: 'No podés iniciar recorridos con otro repartidor'
      });
    }

    const resultado = await simularRecorridoOrdenService(IDorden, id);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const simularRecorridoOrdenService = async (IDorden, IDrepartidor) => {
  const log = createLoggerViaje(IDrepartidor, IDorden);

  // 1️⃣ Obtener orden y validar
  const [[orden]] = await pool.query(
    `
    SELECT o.id, o.IDestado, o.IDrepartidor, c.latitud AS cliente_lat, c.longitud AS cliente_lng
    FROM ordenes o
    JOIN clientes c ON o.IDcliente = c.IDusuario
    WHERE o.id = ?
    `,
    [IDorden]
  );

  if (!orden) throw new Error(`La orden con ID ${IDorden} no existe`);
  if (!orden.IDrepartidor || Number(orden.IDrepartidor) !== Number(IDrepartidor)) {
    throw new Error(`La orden no está asignada al repartidor #${IDrepartidor}`);
  }

  const [[repartidor]] = await pool.query(
    `SELECT id, latitud, longitud FROM repartidores WHERE id = ?`,
    [IDrepartidor]
  );

  const repLat = Number(repartidor.latitud) || -32.4085;
  const repLng = Number(repartidor.longitud) || -63.2415;
  const cliLat = Number(orden.cliente_lat) || -32.4150;
  const cliLng = Number(orden.cliente_lng) || -63.2450;

  // 2️⃣ Obtener locales involucrados y verificar si ya fueron retirados previamente
  const [locales] = await pool.query(
    `
  SELECT 
    l.id, l.nombre, l.latitud, l.longitud,
    IF(ret.id IS NOT NULL, 1, 0) AS retirado,
    COALESCE(MAX(cp.nivel_sensibilidad), 1) AS maxSensibilidad
  FROM detalle_orden do
  JOIN locales l ON do.IDlocal = l.id
  JOIN productos p ON do.IDproducto = p.id
  LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
  LEFT JOIN retiros_locales_orden ret ON ret.IDorden = do.IDorden AND ret.IDlocal = l.id
  WHERE do.IDorden = ? AND do.IDestado != 6
  GROUP BY l.id, l.nombre, l.latitud, l.longitud, ret.id
  ORDER BY maxSensibilidad ASC
  `,
    [IDorden]
  );

  if (locales.length === 0) throw new Error('La orden no tiene productos activos pendientes');

  // 3️⃣ Generar etapas
  const etapas = generarEtapasRuta(
    { latitud: repLat, longitud: repLng },
    locales,
    { latitud: cliLat, longitud: cliLng }
  );

  // Asegurar que la orden pase a "En camino" (ID 5)
  await pool.query(`UPDATE ordenes SET IDestado = 5 WHERE id = ?`, [IDorden]);

  // 4️⃣ Bucle de simulación asíncrono con control de pausas
  (async () => {
    try {
      for (const etapa of etapas) {
        if (etapa.tipo === 'hacia_local') {
          // Si el local ya fue retirado previamente, saltear tramo
          if (etapa.retirado) {
            log.info(`El local "${etapa.localNombre}" ya fue retirado. Se omite la parada.`);
            continue;
          }

          log.info(`Avanzando hacia el local "${etapa.localNombre}"...`);

          // Desplazamiento punto a punto hacia el local
          for (const punto of etapa.puntos) {
            await pool.query(
              `UPDATE repartidores SET latitud = ?, longitud = ?, ultima_ubicacion = NOW() WHERE id = ?`,
              [punto.latitud, punto.longitud, IDrepartidor]
            );
            log.gps(punto.latitud, punto.longitud);
            await new Promise((r) => setTimeout(r, 1500));
          }

          log.local(`Llegada al local: "${etapa.localNombre}". SIMULADOR PAUSADO.`);

          // 🛑 BUCLE DE ESPERA Y PAUSA OBLIGATORIA
          let retiroConfirmado = false;
          while (!retiroConfirmado) {
            // Verificación de cancelación o interrupción del pedido
            const [[ordenCheck]] = await pool.query(
              `SELECT IDestado FROM ordenes WHERE id = ?`,
              [IDorden]
            );

            if (!ordenCheck || Number(ordenCheck.IDestado) === 6) {
              log.alerta(`Simulación terminada: la orden #${IDorden} se canceló o modificó.`);
              return;
            }

            // A. Verificar si los productos están listos en el local
            const [[estadoItems]] = await pool.query(
              `SELECT 
                 COUNT(*) AS total_items,
                 SUM(IF(IDestado IN (7, 8), 1, 0)) AS listos_o_retirados
               FROM detalle_orden 
               WHERE IDorden = ? AND IDlocal = ? AND IDestado != 6`,
              [IDorden, etapa.localId]
            );

            if (Number(estadoItems.listos_o_retirados) < Number(estadoItems.total_items)) {
              log.alerta(`El pedido en "${etapa.localNombre}" aún NO está listo para retirar. Esperando preparación del local...`);
            } else {
              log.info(`Pedido en "${etapa.localNombre}" LISTO. Esperando confirmación de retiro en la App...`);
            }

            // B. Verificar si el repartidor confirmó el retiro desde la aplicación
            const [[retiroDB]] = await pool.query(
              `SELECT id FROM retiros_locales_orden WHERE IDorden = ? AND IDlocal = ?`,
              [IDorden, etapa.localId]
            );

            if (retiroDB) {
              retiroConfirmado = true;
              log.éxito(`Retiro confirmado en "${etapa.localNombre}". Reanudando simulación...`);
            } else {
              // Reintentar/Esperar 3 segundos antes de consultar BD nuevamente
              await new Promise((r) => setTimeout(r, 3000));
            }
          }
        } else if (etapa.tipo === 'hacia_cliente') {
          log.info(`Todos los locales retirados. Avanzando hacia el domicilio del cliente...`);

          for (const punto of etapa.puntos) {
            await pool.query(
              `UPDATE repartidores SET latitud = ?, longitud = ?, ultima_ubicacion = NOW() WHERE id = ?`,
              [punto.latitud, punto.longitud, IDrepartidor]
            );
            log.gps(punto.latitud, punto.longitud);
            await new Promise((r) => setTimeout(r, 1500));
          }

          log.fin(`El repartidor llegó a la ubicación del cliente. Ingrese el código OTP para completar la entrega.`);
        }
      }
    } catch (error) {
      log.alerta(`Error inesperado durante la simulación: ${error.message}`);
    }
  })();

  return {
    message: 'Simulación iniciada. El repartidor se detendrá en cada local hasta confirmar el retiro.',
    IDorden,
    IDrepartidor,
    IDestado: 5
  };
};

export const createRepartidorService = async (data) => {
  const { IDusuario, dni, vehiculo } = data;

  // 1️⃣ Validar campos obligatorios básicos
  if (!IDusuario || !dni) {
    throw new Error('IDusuario y dni son obligatorios');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 2️⃣ Validar que el usuario exista Y tenga el rol de repartidor
    const [[usuario]] = await conn.query(
      `SELECT u.id, r.nombre AS rol 
       FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id 
       WHERE u.id = ?`,
      [IDusuario]
    );

    if (!usuario) {
      throw new Error('El IDusuario especificado no existe');
    }

    if (String(usuario.rol).toLowerCase() !== 'repartidor') {
      throw new Error('El usuario especificado no tiene asignado el rol de repartidor');
    }

    // 3️⃣ Validar duplicados de DNI y IDusuario
    const [dniExiste] = await conn.query(
      `SELECT id FROM repartidores WHERE dni = ?`,
      [dni]
    );
    if (dniExiste.length > 0) {
      throw new Error('El DNI ingresado ya se encuentra registrado');
    }

    const [repartidorExiste] = await conn.query(
      `SELECT id FROM repartidores WHERE IDusuario = ?`,
      [IDusuario]
    );
    if (repartidorExiste.length > 0) {
      throw new Error('Este usuario ya está registrado como repartidor');
    }

    // 4️⃣ Crear repartidor con latitud/longitud en NULL por defecto
    const [repartidorResult] = await conn.query(
      `
      INSERT INTO repartidores (IDusuario, dni, validado, disponible, latitud, longitud, ultima_ubicacion)
      VALUES (?, ?, 0, 1, NULL, NULL, NULL)
      `,
      [IDusuario, dni]
    );

    const IDrepartidor = repartidorResult.insertId;

    // 5️⃣ Registrar Vehículo (Si se envían datos del vehículo)
    let vehiculoRegistrado = null;

    if (vehiculo) {
      const {
        IDtipo_vehiculo,
        marca,
        modelo,
        anio,
        patente,
        seguro_vigente,
        licencia_vigente,
        bici_propia
      } = vehiculo;

      if (!IDtipo_vehiculo) {
        throw new Error('Debe especificar el IDtipo_vehiculo');
      }

      // Validar existencia del tipo de vehículo
      const [[tipoExiste]] = await conn.query(
        `SELECT id FROM tipos_vehiculo WHERE id = ?`,
        [IDtipo_vehiculo]
      );
      if (!tipoExiste) {
        throw new Error('El IDtipo_vehiculo ingresado no existe');
      }

      const [vehiculoResult] = await conn.query(
        `
        INSERT INTO vehiculos_repartidor 
        (IDrepartidor, IDtipo_vehiculo, marca, modelo, anio, patente, seguro_vigente, licencia_vigente, bici_propia, activo, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'APROBADO')
        `,
        [
          IDrepartidor,
          IDtipo_vehiculo,
          marca || null,
          modelo || null,
          anio || null,
          patente || null,
          seguro_vigente !== undefined ? (seguro_vigente ? 1 : 0) : null,
          licencia_vigente !== undefined ? (licencia_vigente ? 1 : 0) : null,
          bici_propia !== undefined ? (bici_propia ? 1 : 0) : null
        ]
      );

      vehiculoRegistrado = {
        id: vehiculoResult.insertId,
        IDtipo_vehiculo,
        marca,
        modelo,
        patente
      };
    }

    await conn.commit();

    return {
      message: 'Perfil de repartidor y vehículo registrados correctamente. Pendiente de validación.',
      repartidor: {
        id: IDrepartidor,
        IDusuario,
        dni,
        validado: 0,
        disponible: 1,
        latitud: null,
        longitud: null
      },
      vehiculo: vehiculoRegistrado
    };

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// Obtener todos los tipos de vehículos disponibles (Moto, Bici, Auto, etc.)
export const getTiposVehiculoService = async () => {
  const [rows] = await pool.query(`SELECT * FROM tipos_vehiculo`);
  return rows;
};

// Asignar o agregar un nuevo vehículo a un repartidor existente
export const addVehiculoRepartidorService = async (IDrepartidor, data) => {
  const {
    IDtipo_vehiculo,
    marca,
    modelo,
    anio,
    patente,
    seguro_vigente,
    licencia_vigente,
    bici_propia
  } = data;

  if (!IDtipo_vehiculo) {
    throw new Error('El campo IDtipo_vehiculo es obligatorio');
  }

  const [result] = await pool.query(
    `
    INSERT INTO vehiculos_repartidor 
    (IDrepartidor, IDtipo_vehiculo, marca, modelo, anio, patente, seguro_vigente, licencia_vigente, bici_propia, activo, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'APROBADO')
    `,
    [
      IDrepartidor,
      IDtipo_vehiculo,
      marca || null,
      modelo || null,
      anio || null,
      patente || null,
      seguro_vigente !== undefined ? (seguro_vigente ? 1 : 0) : null,
      licencia_vigente !== undefined ? (licencia_vigente ? 1 : 0) : null,
      bici_propia !== undefined ? (bici_propia ? 1 : 0) : null
    ]
  );

  return {
    message: 'Vehículo asociado al repartidor con éxito',
    vehiculoId: result.insertId
  };
};

// Endpoint de Aprobación por parte de la Admin
export const validarRepartidorService = async (id, validado) => {
  const [result] = await pool.query(
    `UPDATE repartidores SET validado = ? WHERE id = ?`,
    [validado ? 1 : 0, id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Repartidor no encontrado');
  }

  return { message: `Estado de validación del repartidor actualizado a: ${validado ? 'Aprobado' : 'Pendiente'}` };
};

export const updateUbicacionService = async (IDusuario, latitud, longitud) => {
  // 📍 Coordenadas por defecto (Centro de Villa María) por si no vienen en el Body
  const DEFAULT_LAT = -32.4085;
  const DEFAULT_LNG = -63.2415;

  const lat = latitud !== undefined ? Number(latitud) : DEFAULT_LAT;
  const lng = longitud !== undefined ? Number(longitud) : DEFAULT_LNG;

  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('Coordenadas GPS no válidas');
  }

  const [result] = await pool.query(
    `UPDATE repartidores 
     SET latitud = ?, longitud = ?, ultima_ubicacion = NOW() 
     WHERE IDusuario = ?`,
    [lat, lng, IDusuario]
  );

  if (result.affectedRows === 0) {
    throw new Error('No se encontró el registro de repartidor para este usuario');
  }

  return {
    message: 'Ubicación del repartidor actualizada correctamente',
    latitud: lat,
    longitud: lng
  };
};

export const getDisponibilidadService = async (IDusuario) => {
  const [[repartidor]] = await pool.query(
    `SELECT disponible FROM repartidores WHERE IDusuario = ?`,
    [IDusuario]
  );

  if (!repartidor) {
    throw new Error('No se encontró el registro de repartidor para este usuario');
  }

  return { disponible: Number(repartidor.disponible) === 1 };
};

export const updateDisponibilidadService = async (IDusuario, disponible) => {
  const estado = disponible === true || disponible === 1 || disponible === '1' ? 1 : 0;

  const [result] = await pool.query(
    `UPDATE repartidores SET disponible = ? WHERE IDusuario = ?`,
    [estado, IDusuario]
  );

  if (result.affectedRows === 0) {
    throw new Error('No se encontró el registro de repartidor para este usuario');
  }

  return {
    disponible: estado === 1,
    message: estado === 1
      ? 'Ahora estás disponible para recibir pedidos.'
      : 'Dejaste de recibir nuevos pedidos.'
  };
};

export const getRepartidoresAdminService = async () => {
  const [rows] = await pool.query(`
    SELECT
      r.id,
      r.IDusuario,
      u.username,
      u.email,
      r.dni,
      r.validado,
      r.disponible,
      r.IDvehiculo_activo,
      r.creado_en,
      r.latitud,
      r.longitud,
      r.ultima_ubicacion,
      COALESCE(
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', v.id,
              'tipo_vehiculo', tv.nombre,
              'marca', COALESCE(v.marca, ''),
              'modelo', COALESCE(v.modelo, ''),
              'patente', COALESCE(v.patente, ''),
              'estado', v.estado,
              'motivo_rechazo', COALESCE(v.motivo_rechazo, ''),
              'cedula_url', COALESCE(v.cedula_url, ''),
              'seguro_url', COALESCE(v.seguro_url, ''),
              'licencia_url', COALESCE(v.licencia_url, '')
            )
          )
          FROM vehiculos_repartidor v
          JOIN tipos_vehiculo tv ON tv.id = v.IDtipo_vehiculo
          WHERE v.IDrepartidor = r.id AND v.activo = 1
        ),
        JSON_ARRAY()
      ) AS vehiculos
    FROM repartidores r
    JOIN usuarios u ON u.id = r.IDusuario
    ORDER BY r.id DESC
  `);

  return rows.map((r) => ({
    ...r,
    vehiculos: typeof r.vehiculos === 'string' ? JSON.parse(r.vehiculos) : (r.vehiculos || [])
  }));
};

export const getMisVehiculosService = async (IDusuario) => {
  const [rows] = await pool.query(
    `
    SELECT
      v.id AS IDvehiculo,
      v.IDrepartidor,
      v.IDtipo_vehiculo,
      tv.nombre AS tipo_vehiculo,
      v.marca,
      v.modelo,
      v.anio,
      v.patente,
      v.cedula_url,
      v.seguro_url,
      v.licencia_url,
      v.estado,
      v.motivo_rechazo,
      v.activo,
      r.IDvehiculo_activo
    FROM vehiculos_repartidor v
    JOIN repartidores r ON r.id = v.IDrepartidor
    JOIN tipos_vehiculo tv ON tv.id = v.IDtipo_vehiculo
    WHERE r.IDusuario = ?
    ORDER BY v.id DESC
    `,
    [IDusuario]
  );

  return rows;
};

export const solicitarVehiculoService = async (IDusuario, data, archivos = {}) => {
  const {
    IDtipo_vehiculo,
    marca,
    modelo,
    anio,
    patente,
    seguro_vigente,
    licencia_vigente,
    bici_propia
  } = data;

  if (!IDtipo_vehiculo) {
    throw new Error('El tipo de vehículo es obligatorio');
  }

  const [[repartidor]] = await pool.query(
    `SELECT id FROM repartidores WHERE IDusuario = ?`,
    [IDusuario]
  );
  if (!repartidor) throw new Error('El usuario no está registrado como repartidor');

  const [[tipo]] = await pool.query(
    `SELECT id FROM tipos_vehiculo WHERE id = ?`,
    [IDtipo_vehiculo]
  );
  if (!tipo) throw new Error('El tipo de vehículo no existe');

  const [result] = await pool.query(
    `
    INSERT INTO vehiculos_repartidor
      (IDrepartidor, IDtipo_vehiculo, marca, modelo, anio, patente,
       seguro_vigente, licencia_vigente, bici_propia, cedula_url,
       seguro_url, licencia_url, estado, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', 1)
    `,
    [
      repartidor.id,
      IDtipo_vehiculo,
      marca || null,
      modelo || null,
      anio || null,
      patente || null,
      seguro_vigente !== undefined ? (seguro_vigente ? 1 : 0) : null,
      licencia_vigente !== undefined ? (licencia_vigente ? 1 : 0) : null,
      bici_propia !== undefined ? (bici_propia ? 1 : 0) : null,
      archivos.cedula?.[0] ? `/uploads/${archivos.cedula[0].filename}` : null,
      archivos.seguro?.[0] ? `/uploads/${archivos.seguro[0].filename}` : null,
      archivos.licencia?.[0] ? `/uploads/${archivos.licencia[0].filename}` : null
    ]
  );

  return {
    message: 'Solicitud de vehículo enviada. Está pendiente de revisión.',
    IDvehiculo: result.insertId,
    estado: 'PENDIENTE'
  };
};

export const seleccionarVehiculoActivoService = async (IDusuario, IDvehiculo) => {
  const [[vehiculo]] = await pool.query(
    `
    SELECT v.id
    FROM vehiculos_repartidor v
    JOIN repartidores r ON r.id = v.IDrepartidor
    WHERE v.id = ? AND r.IDusuario = ? AND v.estado = 'APROBADO' AND v.activo = 1
    `,
    [IDvehiculo, IDusuario]
  );

  if (!vehiculo) {
    throw new Error('El vehículo no existe, no está aprobado o no te pertenece');
  }

  await pool.query(
    `UPDATE repartidores SET IDvehiculo_activo = ? WHERE IDusuario = ?`,
    [IDvehiculo, IDusuario]
  );

  return { message: 'Vehículo activo actualizado correctamente', IDvehiculo_activo: Number(IDvehiculo) };
};

export const getVehiculosPendientesService = async (estado = 'PENDIENTE') => {
  const estadoNormalizado = String(estado).toUpperCase();
  if (!['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(estadoNormalizado)) {
    throw new Error('El estado debe ser PENDIENTE, APROBADO o RECHAZADO');
  }

  const [rows] = await pool.query(
    `
    SELECT v.*, r.IDusuario, u.username, u.nombre, u.apellido, tv.nombre AS tipo_vehiculo
    FROM vehiculos_repartidor v
    JOIN repartidores r ON r.id = v.IDrepartidor
    JOIN usuarios u ON u.id = r.IDusuario
    JOIN tipos_vehiculo tv ON tv.id = v.IDtipo_vehiculo
    WHERE v.estado = ?
    ORDER BY v.id DESC
    `,
    [estadoNormalizado]
  );
  return rows;
};

export const revisarVehiculoService = async (IDvehiculo, estado, motivoRechazo = null) => {
  const estadoNormalizado = String(estado).toUpperCase();
  if (!['APROBADO', 'RECHAZADO'].includes(estadoNormalizado)) {
    throw new Error('El estado debe ser APROBADO o RECHAZADO');
  }

  if (estadoNormalizado === 'RECHAZADO' && !String(motivoRechazo || '').trim()) {
    throw new Error('El motivo de rechazo es obligatorio');
  }

  const [result] = await pool.query(
    `UPDATE vehiculos_repartidor SET estado = ?, motivo_rechazo = ? WHERE id = ?`,
    [estadoNormalizado, estadoNormalizado === 'RECHAZADO' ? String(motivoRechazo).trim() : null, IDvehiculo]
  );

  if (result.affectedRows === 0) throw new Error('Vehículo no encontrado');
  return { message: `Vehículo ${estadoNormalizado.toLowerCase()} correctamente` };
};

// repartidores.service.js
export const getMiPerfilRepartidorService = async (IDusuario) => {
  const [[perfil]] = await pool.query(
    `
    SELECT 
      r.id AS IDrepartidor,
      r.dni,
      r.validado,
      r.disponible,
      u.username,
      u.email,
      u.nombre,
      u.apellido
    FROM repartidores r
    JOIN usuarios u ON u.id = r.IDusuario
    WHERE r.IDusuario = ?
    `,
    [IDusuario]
  );

  if (!perfil) {
    throw new Error('Perfil de repartidor no encontrado');
  }

  return perfil;
};

export const getGananciasHoyService = async (IDusuario) => {
  const [[repartidor]] = await pool.query(
    `SELECT id FROM repartidores WHERE IDusuario = ?`,
    [IDusuario]
  );

  if (!repartidor) {
    throw new Error('El usuario no está registrado como repartidor');
  }

  const [[resumen]] = await pool.query(
    `
    SELECT 
      COUNT(o.id) AS total_pedidos_hoy,
      COALESCE(SUM(o.costo_envio), 0.00) AS ganancias_envio_hoy,
      -- Efectivo total que entró al bolsillo (Productos + Envío)
      COALESCE(SUM(CASE WHEN o.IDmetodo_pago = 1 THEN o.total ELSE 0.00 END), 0.00) AS efectivo_recaudado_hoy,
      -- Deuda real a rendir a la plataforma/locales (Solo Subtotal de productos en efectivo)
      COALESCE(SUM(CASE WHEN o.IDmetodo_pago = 1 THEN o.precio ELSE 0.00 END), 0.00) AS efectivo_a_rendir_hoy
    FROM ordenes o
    WHERE o.IDrepartidor = ? 
      AND o.IDestado = 3
      AND DATE(o.creado_en) = CURDATE()
    `,
    [repartidor.id]
  );

  return {
    totalPedidosHoy: Number(resumen.total_pedidos_hoy || 0),
    gananciasEnvioHoy: Number(resumen.ganancias_envio_hoy || 0),
    efectivoRecaudadoHoy: Number(resumen.efectivo_recaudado_hoy || 0),
    efectivoARendirHoy: Number(resumen.efectivo_a_rendir_hoy || 0)
  };
};