import { pool } from '../config/db.js';

// 1. Crear una notificación
export const createNotificationService = async (IDusuario, IDorden, titulo, mensaje) => {
  const [result] = await pool.query(
    `INSERT INTO notificaciones (IDusuario, IDorden, titulo, mensaje)
     VALUES (?, ?, ?, ?)`,
    [IDusuario, IDorden || null, titulo, mensaje]
  );
  return { id: result.insertId, IDusuario, IDorden, titulo, mensaje, leido: 0 };
};

// 2. Obtener notificaciones del usuario autenticado
export const getMyNotificationsService = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, IDorden, titulo, mensaje, leido, creado_en
     FROM notificaciones
     WHERE IDusuario = ?
     ORDER BY creado_en DESC`,
    [userId]
  );
  return rows;
};

// 3. Marcar una notificación individual como leída
export const markAsReadService = async (notificationId, userId) => {
  const [result] = await pool.query(
    `UPDATE notificaciones
     SET leido = 1
     WHERE id = ? AND IDusuario = ?`,
    [notificationId, userId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Notificación no encontrada o no pertenece al usuario.');
  }

  return { message: 'Notificación marcada como leída', id: notificationId };
};

// 4. Marcar todas como leídas
export const markAllAsReadService = async (userId) => {
  await pool.query(
    `UPDATE notificaciones
     SET leido = 1
     WHERE IDusuario = ? AND leido = 0`,
    [userId]
  );
  return { message: 'Todas las notificaciones fueron marcadas como leídas' };
};