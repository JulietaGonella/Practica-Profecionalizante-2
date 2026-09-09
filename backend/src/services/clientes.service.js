import { pool } from '../config/db.js';

// Listar todas las direcciones del cliente
export const getDireccionesClienteService = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, alias, direccion, piso, departamento, referencia, latitud, longitud, es_principal
     FROM direcciones_cliente
     WHERE IDusuario = ?
     ORDER BY es_principal DESC, id DESC`,
    [userId]
  );
  return rows;
};

// Crear nueva dirección
export const createDireccionClienteService = async (userId, data) => {
  const { alias, direccion, piso, departamento, referencia, latitud, longitud, es_principal } = data;

  if (!direccion || latitud === undefined || longitud === undefined) {
    throw new Error('Dirección, latitud y longitud son requeridas');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Si la nueva dirección se marca como principal, desmarcar las anteriores
    if (es_principal) {
      await conn.query(
        `UPDATE direcciones_cliente SET es_principal = 0 WHERE IDusuario = ?`,
        [userId]
      );
    }

    const [result] = await conn.query(
      `INSERT INTO direcciones_cliente 
       (IDusuario, alias, direccion, piso, departamento, referencia, latitud, longitud, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        alias ? String(alias).trim() : 'Mi Ubicación',
        String(direccion).trim(),
        piso ? String(piso).trim() : null,
        departamento ? String(departamento).trim() : null,
        referencia ? String(referencia).trim() : null,
        Number(latitud),
        Number(longitud),
        es_principal ? 1 : 0
      ]
    );

    await conn.commit();
    return { id: result.insertId, ...data };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// Eliminar dirección
export const deleteDireccionClienteService = async (userId, direccionId) => {
  const [result] = await pool.query(
    `DELETE FROM direcciones_cliente WHERE id = ? AND IDusuario = ?`,
    [direccionId, userId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Dirección no encontrada o no pertenece al usuario');
  }
  return { message: 'Dirección eliminada correctamente' };
};

// 1. Para listar todos los clientes (sin filtro por userId)
export const getClientesService = async () => {
  const [rows] = await pool.query(
    `
    SELECT
      c.id,
      c.IDusuario,
      c.telefono,
      c.direccion,
      c.piso,
      c.departamento,
      c.referencia,
      c.latitud,
      c.longitud,
      u.nombre,
      u.apellido,
      u.username,
      u.email,
      u.creado_en
    FROM clientes c
    JOIN usuarios u ON c.IDusuario = u.id
    ORDER BY u.creado_en DESC
    `
  );

  return rows;
};

// 2. Renombrar esta función a getPerfilClienteService
export const getPerfilClienteService = async (userId) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.telefono, c.direccion, c.piso, c.departamento, c.referencia, c.latitud, c.longitud,
            u.nombre, u.apellido, u.username, u.email
     FROM clientes c
     JOIN usuarios u ON c.IDusuario = u.id
     WHERE c.IDusuario = ?`,
    [userId]
  );

  if (rows.length === 0) {
    throw new Error('Perfil de cliente no encontrado');
  }

  return rows[0];
};

export const updatePerfilClienteService = async (userId, data) => {
  const {
    nombre,
    apellido,
    telefono,
    direccion,
    piso,
    departamento,
    referencia,
    latitud,
    longitud
  } = data;

  if (!nombre || !apellido || !direccion || !telefono || latitud === undefined || longitud === undefined) {
    throw new Error('Nombre, apellido, dirección, teléfono, latitud y longitud son requeridos');
  }

  const lat = Number(latitud);
  const lng = Number(longitud);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('La latitud debe estar entre -90 y 90');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('La longitud debe estar entre -180 y 180');
  }

  await pool.query(
    `UPDATE usuarios
     SET nombre = ?, apellido = ?
     WHERE id = ?`,
    [String(nombre).trim(), String(apellido).trim(), userId]
  );

  await pool.query(
    `UPDATE clientes
     SET telefono = ?, direccion = ?, piso = ?, departamento = ?, referencia = ?, latitud = ?, longitud = ?
     WHERE IDusuario = ?`,
    [
      String(telefono).trim(),
      String(direccion).trim(),
      piso ? String(piso).trim() : null,
      departamento ? String(departamento).trim() : null,
      referencia ? String(referencia).trim() : null,
      lat,
      lng,
      userId
    ]
  );

  return getPerfilClienteService(userId); // 👈 Asegúrate de usar el nuevo nombre aquí también
};

// Obtener el historial completo de pedidos de un cliente específico para el panel de administración
export const getHistorialClienteService = async (clienteUserId) => {
  const [rows] = await pool.query(
    `SELECT 
        o.id,
        o.total,
        o.creado_en,
        e.nombre AS estado,
        GROUP_CONCAT(DISTINCT l.nombre SEPARATOR ', ') AS locales
     FROM ordenes o
     JOIN estados e ON o.IDestado = e.id
     JOIN detalle_orden do ON o.id = do.IDorden
     JOIN locales l ON do.IDlocal = l.id
     WHERE o.IDcliente = ?
     GROUP BY o.id, o.total, o.creado_en, e.nombre
     ORDER BY o.creado_en DESC`,
    [clienteUserId]
  );

  return rows;
}; 