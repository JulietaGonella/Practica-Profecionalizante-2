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