import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { COMMISSIONS } from '../config/commissions.js';

// ========================================== 
// FUNCIONES AUXILIARES Y SERVICIOS DE CREACIÓN
// ==========================================

const crearUsuarioEnTransaccion = async (conn, data, rolNombre) => {
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
      (username, email, password_hash, rol_id)
    VALUES (?, ?, ?, ?)
    `,
    [cleanUsername, cleanEmail, passwordHash, rol.id]
  );

  return {
    id: resultado.insertId,
    username: cleanUsername,
    email: cleanEmail,
    rol_id: rol.id,
    rol: rol.nombre
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

export const crearRepartidorCompletoService = async (data) => {
  const {
    username,
    email,
    password,
    dni,
    vehiculo
  } = data;

  if (!dni) {
    throw new Error('El DNI es obligatorio.');
  }

  if (!vehiculo?.IDtipo_vehiculo) {
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

    await conn.query(
      `
      INSERT INTO vehiculos_repartidor
        (IDrepartidor, IDtipo_vehiculo, marca, modelo, patente, activo, estado)
      VALUES (?, ?, ?, ?, ?, 1, 'APROBADO')
      `,
      [
        repartidorResult.insertId,
        vehiculo.IDtipo_vehiculo,
        vehiculo.marca || null,
        vehiculo.modelo || null,
        vehiculo.patente || null
      ]
    );

    await conn.commit();

    return {
      message:
        'Repartidor y usuario creados correctamente. Pendiente de validación.',
      usuario,
      repartidor: {
        id: repartidorResult.insertId,
        IDusuario: usuario.id,
        dni,
        validado: 0,
        disponible: 1
      }
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
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