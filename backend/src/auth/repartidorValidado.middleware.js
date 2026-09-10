// auth/repartidorValidado.middleware.js
import { pool } from '../config/db.js';

export const requireRepartidorValidado = async (req, res, next) => {
  try {
    if (req.user?.rol?.toLowerCase() !== 'repartidor') {
      return next();
    }

    const [[repartidor]] = await pool.query(
      `SELECT validado FROM repartidores WHERE IDusuario = ?`,
      [req.user.id]
    );

    if (!repartidor || Number(repartidor.validado) !== 1) {
      return res.status(403).json({
        error: 'Tu cuenta de repartidor aún no ha sido validada por un administrador.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar estado del repartidor.' });
  }
};

export const updateDisponibilidadService = async (IDusuario, disponible) => {
  const estado = disponible === true || disponible === 1 || disponible === '1' ? 1 : 0;

  if (estado === 1) {
    // Validar documentación del vehículo activo antes de permitir ponerse disponible
    const [[vehiculoActivo]] = await pool.query(
      `
      SELECT v.* 
      FROM vehiculos_repartidor v
      JOIN repartidores r ON r.IDvehiculo_activo = v.id
      WHERE r.IDusuario = ?
      `,
      [IDusuario]
    );

    if (vehiculoActivo) {
      const evalDoc = evaluarEstadoDocumentación(vehiculoActivo);
      if (!evalDoc.documentacionValida) {
        throw new Error('No puedes ponerte disponible. Tienes documentación vencida en tu vehículo activo.');
      }
    }
  }

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