import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { COMMISSIONS } from '../config/commissions.js';

// ========================================== 
// FUNCIONES AUXILIARES Y SERVICIOS DE CREACIÓN
// ==========================================

const crearUsuarioEnTransaccion = async (conn, data, rolNombre, debeCambiarPass = 1) => {
  const { username, email, password } = data;

  if (!username || !email || !password) {
    throw new Error('Username, email y password son obligatorios.');
  }

  if (String(password).length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  const [[duplicado]] = await conn.query(
    `
    SELECT id
    FROM usuarios
    WHERE LOWER(username) = LOWER(?)
       OR LOWER(email) = ?
    `,
    [cleanUsername, cleanEmail]
  );

  if (duplicado) {
    throw new Error('El username o correo electrónico ya está registrado.');
  }

  const [[rol]] = await conn.query(
    `
    SELECT id, nombre
    FROM roles
    WHERE LOWER(nombre) = LOWER(?)
    `,
    [rolNombre]
  );

  if (!rol) {
    throw new Error(`No existe el rol "${rolNombre}".`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [resultado] = await conn.query(
    `
    INSERT INTO usuarios
      (username, email, password_hash, rol_id, debe_cambiar_pass)
    VALUES (?, ?, ?, ?, ?)
    `,
    [cleanUsername, cleanEmail, passwordHash, rol.id, debeCambiarPass ? 1 : 0]
  );

  return {
    id: resultado.insertId,
    username: cleanUsername,
    email: cleanEmail,
    rol_id: rol.id,
    rol: rol.nombre,
    debe_cambiar_pass: Boolean(debeCambiarPass)
  };
};

export const crearAdministradorService = async (data) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const usuario = await crearUsuarioEnTransaccion(
      conn,
      data,
      'administrador'
    );

    await conn.commit();

    return {
      message: 'Administrador creado correctamente.',
      usuario
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const crearLocalCompletoService = async (data) => {
  const {
    username,
    email,
    password,
    nombre,
    direccion,
    latitud,
    longitud
  } = data;

  if (
    !nombre ||
    !direccion ||
    latitud === undefined ||
    longitud === undefined
  ) {
    throw new Error(
      'Nombre, dirección, latitud y longitud son obligatorios.'
    );
  }

  const lat = Number(latitud);
  const lng = Number(longitud);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('La latitud no es válida.');
  }

  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('La longitud no es válida.');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const usuario = await crearUsuarioEnTransaccion(
      conn,
      { username, email, password },
      'administrador local'
    );

    const [localResult] = await conn.query(
      `
      INSERT INTO locales
        (nombre, direccion, latitud, longitud, IDusuario)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        String(nombre).trim(),
        String(direccion).trim(),
        lat.toFixed(8),
        lng.toFixed(8),
        usuario.id
      ]
    );

    await conn.commit();

    return {
      message: 'Local y usuario creados correctamente.',
      usuario,
      local: {
        id: localResult.insertId,
        nombre,
        direccion,
        latitud: lat,
        longitud: lng,
        IDusuario: usuario.id
      }
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// services/admin.service.js
export const crearRepartidorCompletoService = async (data, archivos = {}) => {
  const {
    username,
    email,
    password,
    dni,
    vehiculo
  } = data;

  if (!dni) throw new Error('El DNI es obligatorio.');

  const datosVehiculo = typeof vehiculo === 'string' ? JSON.parse(vehiculo) : vehiculo;

  if (!datosVehiculo?.IDtipo_vehiculo) {
    throw new Error('El tipo de vehículo es obligatorio.');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const usuario = await crearUsuarioEnTransaccion(
      conn,
      { username, email, password },
      'repartidor'
    );

    const [repartidorResult] = await conn.query(
      `
      INSERT INTO repartidores
        (IDusuario, dni, validado, disponible)
      VALUES (?, ?, 0, 1)
      `,
      [usuario.id, String(dni).trim()]
    );

    const IDrepartidor = repartidorResult.insertId;

    const cedulaUrl = archivos.cedula?.[0] ? `/uploads/${archivos.cedula[0].filename}` : null;
    const seguroUrl = archivos.seguro?.[0] ? `/uploads/${archivos.seguro[0].filename}` : null;
    const licenciaUrl = archivos.licencia?.[0] ? `/uploads/${archivos.licencia[0].filename}` : null;

    // 👈 Actualización de la consulta SQL insertando las fechas de vencimiento
    const [vehiculoResult] = await conn.query(
      `
      INSERT INTO vehiculos_repartidor
        (IDrepartidor, IDtipo_vehiculo, marca, modelo, anio, patente,
         seguro_vigente, licencia_vigente, bici_propia,
         cedula_url, seguro_url, licencia_url,
         fecha_vencimiento_licencia, fecha_vencimiento_seguro, fecha_vencimiento_cedula,
         activo, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'APROBADO')
      `,
      [
        IDrepartidor,
        datosVehiculo.IDtipo_vehiculo,
        datosVehiculo.marca || null,
        datosVehiculo.modelo || null,
        datosVehiculo.anio || null,
        datosVehiculo.patente || null,
        datosVehiculo.seguro_vigente ? 1 : 0,
        datosVehiculo.licencia_vigente ? 1 : 0,
        datosVehiculo.bici_propia ? 1 : 0,
        cedulaUrl,
        seguroUrl,
        licenciaUrl,
        datosVehiculo.fecha_vencimiento_licencia || null, // 👈
        datosVehiculo.fecha_vencimiento_seguro || null,   // 👈
        datosVehiculo.fecha_vencimiento_cedula || null,   // 👈
      ]
    );

    await conn.query(
      `UPDATE repartidores SET IDvehiculo_activo = ? WHERE id = ?`,
      [vehiculoResult.insertId, IDrepartidor]
    );

    await conn.commit();

    return {
      message: 'Repartidor creado en estado PENDIENTE/INVALIDADO. Vehículo APROBADO correctamente.',
      usuario,
      repartidor: {
        id: IDrepartidor,
        IDusuario: usuario.id,
        dni,
        validado: 0,
        disponible: 1,
        IDvehiculo_activo: vehiculoResult.insertId
      },
      vehiculo: {
        id: vehiculoResult.insertId,
        estado: 'APROBADO',
        cedula_url: cedulaUrl,
        seguro_url: seguroUrl,
        licencia_url: licenciaUrl
      }
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// Obtener todos los locales (habilitados y deshabilitados) para el admin
export const getLocalesAdminService = async () => {
  const [locales] = await pool.query(`
    SELECT 
      l.id,
      l.nombre,
      l.direccion,
      l.telefono,
      l.latitud,
      l.longitud,
      l.es_activo,
      l.esta_operativo,
      l.logo_url,
      l.banner_url,
      l.foto_url,
      l.costo_envio_base,
      l.tiempo_preparacion_promedio,
      l.IDusuario,
      u.username AS usuario_admin,
      u.email AS email_admin
    FROM locales l
    LEFT JOIN usuarios u ON l.IDusuario = u.id
    ORDER BY l.id DESC
  `);

  for (const local of locales) {
    // Obtener todos los horarios asociados al local
    const [horarios] = await pool.query(
      `
      SELECT
        id,
        dia_semana,
        hora_apertura,
        hora_cierre,
        es_activo
      FROM horarios_local
      WHERE IDlocal = ?
      `,
      [local.id]
    );

    local.horarios = horarios;
  }

  return locales;
}; 

// ==========================================
// SERVICIOS DE DASHBOARD Y MÉTRICAS
// ==========================================

export const getDashboardMetricsService = async ({ desde, hasta, local_id, repartidor_id }) => {
  // --- 1. Resumen Global de KPIs ---
  const [kpis] = await pool.query(`
    SELECT 
      COUNT(o.id) AS total_pedidos,
      SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END) AS entregados,
      SUM(CASE WHEN o.IDestado = 6 THEN 1 ELSE 0 END) AS cancelados,
      COALESCE(SUM(CASE WHEN o.IDestado = 3 THEN o.total ELSE 0 END), 0) AS ingresos_totales
    FROM ordenes o
  `);

  // --- 2. Demanda por Categoría (JOIN ordenes -> detalle_orden -> productos -> categorias_productos) ---
  const [categorias] = await pool.query(`
    SELECT 
      COALESCE(cp.nombre, 'Sin Categoría') AS categoria,
      SUM(do.cantidad) AS total_vendido
    FROM detalle_orden do
    JOIN productos p ON do.IDproducto = p.id
    LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
    JOIN ordenes o ON do.IDorden = o.id
    WHERE o.IDestado = 3 -- Entregados
    GROUP BY cp.id, cp.nombre
    ORDER BY total_vendido DESC
  `);

  // --- 3. Desglose Por Métodos de Pago ---
  const [metodosPago] = await pool.query(`
    SELECT 
      mp.nombre AS metodo,
      COUNT(o.id) AS cantidad,
      ROUND((COUNT(o.id) * 100.0 / (SELECT COUNT(*) FROM ordenes)), 2) AS porcentaje
    FROM ordenes o
    JOIN metodos_pago mp ON o.IDmetodo_pago = mp.id
    GROUP BY mp.id, mp.nombre
  `);

  // --- 4. Evolución Temporal (Evolución diaria) ---
  const [evolucionTemporal] = await pool.query(`
    SELECT 
      DATE(h.creado_en) AS fecha,
      SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END) AS entregados,
      SUM(CASE WHEN o.IDestado = 6 THEN 1 ELSE 0 END) AS cancelados
    FROM ordenes o
    JOIN hitorial_estado_orden h ON o.id = h.IDorden AND h.IDestado = o.IDestado
    GROUP BY DATE(h.creado_en)
    ORDER BY fecha ASC
  `);

  return {
    kpis: kpis[0],
    distribucion_categorias: categorias,
    metodos_pago: metodosPago,
    evolucion_temporal: evolucionTemporal
  };
};

// admin.service.js

// Helper para formatear objeto Date a 'YYYY-MM-DD'
const formatearFechaSQL = (fecha) => {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

export const evaluarEstadoDocumentación = (vehiculo) => {
  // Ajustamos la comparación a la medianoche de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaLicencia = vehiculo.fecha_vencimiento_licencia ? new Date(vehiculo.fecha_vencimiento_licencia) : null;
  const fechaSeguro = vehiculo.fecha_vencimiento_seguro ? new Date(vehiculo.fecha_vencimiento_seguro) : null;
  const fechaCedula = vehiculo.fecha_vencimiento_cedula ? new Date(vehiculo.fecha_vencimiento_cedula) : null;

  const licenciaVencida = fechaLicencia ? fechaLicencia < hoy : false;
  const seguroVencido = fechaSeguro ? fechaSeguro < hoy : false;
  const cedulaVencida = fechaCedula ? fechaCedula < hoy : false;

  const tieneDocumentosVencidos = licenciaVencida || seguroVencido || cedulaVencida;

  return {
    fecha_vencimiento_licencia: formatearFechaSQL(vehiculo.fecha_vencimiento_licencia),
    fecha_vencimiento_seguro: formatearFechaSQL(vehiculo.fecha_vencimiento_seguro),
    fecha_vencimiento_cedula: formatearFechaSQL(vehiculo.fecha_vencimiento_cedula),
    licenciaVencida,
    seguroVencido,
    cedulaVencida,
    documentacionValida: !tieneDocumentosVencidos
  };
};

export const actualizarVencimientosVehiculoService = async (vehiculoId, datos) => {
  const { fecha_vencimiento_licencia, fecha_vencimiento_seguro, fecha_vencimiento_cedula } = datos;

  await pool.query(
    `UPDATE vehiculos_repartidor 
     SET fecha_vencimiento_licencia = ?, 
         fecha_vencimiento_seguro = ?, 
         fecha_vencimiento_cedula = ? 
     WHERE id = ?`,
    [
      fecha_vencimiento_licencia || null,
      fecha_vencimiento_seguro || null,
      fecha_vencimiento_cedula || null,
      vehiculoId
    ]
  );

  return { message: 'Fechas de vencimiento actualizadas correctamente.' };
};

// Obtener alertas de documentación vencida o a vencer hoy
export const getAlertasDocumentacionVencidaService = async () => {
  const query = `
    SELECT 
      r.id AS repartidor_id,
      u.username,
      u.nombre,
      u.apellido,
      u.email,
      v.id AS vehiculo_id,
      v.tipo_vehiculo,
      v.patente,
      
      -- Verificación de Licencia
      CASE 
        WHEN v.fecha_vencimiento_licencia IS NOT NULL AND v.fecha_vencimiento_licencia <= CURDATE() 
        THEN v.fecha_vencimiento_licencia 
        ELSE NULL 
      END AS licencia_vencida_fecha,
      
      -- Verificación de Seguro
      CASE 
        WHEN v.fecha_vencimiento_seguro IS NOT NULL AND v.fecha_vencimiento_seguro <= CURDATE() 
        THEN v.fecha_vencimiento_seguro 
        ELSE NULL 
      END AS seguro_vencido_fecha,
      
      -- Verificación de Cédula
      CASE 
        WHEN v.fecha_vencimiento_cedula IS NOT NULL AND v.fecha_vencimiento_cedula <= CURDATE() 
        THEN v.fecha_vencimiento_cedula 
        ELSE NULL 
      END AS cedula_vencida_fecha

    FROM vehiculos_repartidor v
    JOIN repartidores r ON v.IDrepartidor = r.id
    JOIN usuarios u ON r.IDusuario = u.id
    WHERE 
      (v.fecha_vencimiento_licencia IS NOT NULL AND v.fecha_vencimiento_licencia <= CURDATE())
      OR (v.fecha_vencimiento_seguro IS NOT NULL AND v.fecha_vencimiento_seguro <= CURDATE())
      OR (v.fecha_vencimiento_cedula IS NOT NULL AND v.fecha_vencimiento_cedula <= CURDATE());
  `;

  const [rows] = await db.query(query);

  // Formateamos los resultados para que la estructura devuelta sea clara
  const alertas = [];

  rows.forEach((row) => {
    const repartidorNombre = [row.nombre, row.apellido].filter(Boolean).join(' ') || row.username;

    const agregarAlerta = (documento, fecha, tipo) => {
      if (!fecha) return;
      
      // Determinar si vence hoy o si ya venció
      const hoy = new Date().toISOString().split('T')[0];
      const fechaDoc = new Date(fecha).toISOString().split('T')[0];
      const estado = fechaDoc === hoy ? 'VENCE_HOY' : 'VENCIDO';

      alertas.push({
        repartidor_id: row.repartidor_id,
        repartidor: repartidorNombre,
        email: row.email,
        vehiculo: `${row.tipo_vehiculo} ${row.patente ? `(${row.patente})` : ''}`,
        documento, // 'Licencia de Conducir', 'Seguro Obligatorio', 'Cédula'
        fecha_vencimiento: fechaDoc,
        estado // 'VENCE_HOY' o 'VENCIDO'
      });
    };

    agregarAlerta('Licencia de Conducir', row.licencia_vencida_fecha);
    agregarAlerta('Seguro Obligatorio', row.seguro_vencido_fecha);
    agregarAlerta('Cédula', row.cedula_vencida_fecha);
  });

  return alertas;
};