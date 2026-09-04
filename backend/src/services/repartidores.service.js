import { pool } from '../config/db.js';
import { generarEtapasRuta } from './ai.service.js';

// 🛠️ Helper de logs estructurados con identificador de contexto
const createLoggerViaje = (IDrepartidor, IDorden) => {
  const prefijo = `[REP #${IDrepartidor} | ORD #${IDorden}]`;

  return {
    info: (msg) => console.log(`ℹ️  ${prefijo} ${msg}`),
    gps: (lat, lng) => console.log(`   📍 ${prefijo} GPS: (${lat}, ${lng})`),
    local: (msg) => console.log(`🏪 ${prefijo} ${msg}`),
    espera: (msg) => console.log(`   ⏳ ${prefijo} ${msg}`),
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

  // 1️⃣ Obtener la orden, el repartidor asignado y los datos del cliente
  const [[orden]] = await pool.query(
    `
    SELECT o.id, o.IDestado, o.IDrepartidor, c.latitud AS cliente_lat, c.longitud AS cliente_lng
    FROM ordenes o
    JOIN clientes c ON o.IDcliente = c.IDusuario
    WHERE o.id = ?
    `,
    [IDorden]
  );

  if (!orden) {
    throw new Error(`La orden con ID ${IDorden} no existe`);
  }

  if (!orden.IDrepartidor) {
    throw new Error(`La orden #${IDorden} aún no ha sido asignada a ningún repartidor`);
  }

  if (Number(orden.IDrepartidor) !== Number(IDrepartidor)) {
    throw new Error(
      `La orden #${IDorden} está asignada al repartidor #${orden.IDrepartidor}, no al repartidor #${IDrepartidor}`
    );
  }

  // 🔄 VALIDACIÓN MODIFICADA: Permite iniciar desde estado 4 (Asignado) o 7 (Listo para retirar)
  const estadosPermitidos = [4, 7];
  if (!estadosPermitidos.includes(Number(orden.IDestado))) {
    throw new Error(
      'El recorrido solo puede iniciarse cuando la orden está en estado "Repartidor asignado" o "Listo para retirar".'
    );
  }

  const [[repartidor]] = await pool.query(
    `SELECT id, latitud, longitud FROM repartidores WHERE id = ?`,
    [IDrepartidor]
  );

  if (!repartidor) {
    throw new Error(`El repartidor con ID ${IDrepartidor} no existe`);
  }

  // 2️⃣ Obtener el ID del estado "En camino"
  const [[estadoEnCamino]] = await pool.query(`SELECT id FROM estados WHERE orden = 4 OR id = 5 LIMIT 1`);

  if (!estadoEnCamino) {
    throw new Error('No se encontró el estado "En camino"');
  }

  // 3️⃣ Coordenadas iniciales
  const repLat = Number(repartidor.latitud) || -32.4085;
  const repLng = Number(repartidor.longitud) || -63.2415;
  const cliLat = Number(orden.cliente_lat) || -32.4150;
  const cliLng = Number(orden.cliente_lng) || -63.2450;

  // 4️⃣ Obtener locales activos (excluyendo items cancelados/rechazados con estado 6)
  const [locales] = await pool.query(
    `
  SELECT 
    l.id, 
    l.nombre, 
    l.latitud, 
    l.longitud,
    MAX(COALESCE(cp.nivel_sensibilidad, 1)) AS maxSensibilidad
  FROM detalle_orden do
  JOIN locales l ON do.IDlocal = l.id
  JOIN productos p ON do.IDproducto = p.id
  LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
  WHERE do.IDorden = ? AND do.IDestado != 6
  GROUP BY l.id, l.nombre, l.latitud, l.longitud
  `,
    [IDorden]
  );

  if (locales.length === 0) {
    throw new Error('La orden no tiene locales o productos activos pendientes de entrega');
  }

  // 5️⃣ Generar las etapas de la ruta
  const etapas = generarEtapasRuta(
    { latitud: repLat, longitud: repLng },
    locales,
    { latitud: cliLat, longitud: cliLng }
  );

  // Forzar el cambio directo a IDestado 5 ('En camino')
  await pool.query(
    `UPDATE ordenes SET IDestado = 5 WHERE id = ?`,
    [IDorden]
  );

  await pool.query(
    `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, 5)`,
    [IDorden]
  );

  log.info(`Simulación iniciada. La orden pasó inmediatamente a EN CAMINO (estado ${estadoEnCamino.id}).`);

  // 6️⃣ Bucle Asíncrono de Simulación (GPS continuo)
  (async () => {
    for (const etapa of etapas) {
      if (etapa.tipo === 'hacia_local') {
        log.info(`En camino hacia local "${etapa.localNombre}"...`);

        for (const punto of etapa.puntos) {
          await pool.query(
            `UPDATE repartidores SET latitud = ?, longitud = ?, ultima_ubicacion = NOW() WHERE id = ?`,
            [punto.latitud, punto.longitud, IDrepartidor]
          );
          log.gps(punto.latitud, punto.longitud);
          await new Promise((r) => setTimeout(r, 1500));
        }

        log.local(`Llegada a "${etapa.localNombre}". Verificando disponibilidad...`);

        let pedidoListo = false;
        while (!pedidoListo) {
          const [items] = await pool.query(
            `SELECT IDestado FROM detalle_orden WHERE IDorden = ? AND IDlocal = ?`,
            [IDorden, etapa.localId]
          );

          const todosListos = items.length > 0 && items.every((i) => i.IDestado === 7);

          if (todosListos) {
            pedidoListo = true;
            log.éxito(`¡El pedido en "${etapa.localNombre}" está LISTO (Estado 7)! Retirando y continuando...`);
          } else {
            log.espera(`"${etapa.localNombre}" aún no marca el pedido como LISTO (Estado 7). Esperando en el local...`);
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      } else if (etapa.tipo === 'hacia_cliente') {
        log.info(`Tramo final iniciado. En viaje hacia la ubicación del cliente...`);

        for (const punto of etapa.puntos) {
          await pool.query(
            `UPDATE repartidores SET latitud = ?, longitud = ?, ultima_ubicacion = NOW() WHERE id = ?`,
            [punto.latitud, punto.longitud, IDrepartidor]
          );
          log.gps(punto.latitud, punto.longitud);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // 🏁 Al llegar al destino final del GPS
    log.fin(`El repartidor ha llegado al destino del cliente. Ingrese el código OTP para marcar el pedido como ENTREGADO.`);
  })();

  return {
    message: 'Simulación de recorrido GPS iniciada en segundo plano.',
    IDorden,
    IDrepartidor
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