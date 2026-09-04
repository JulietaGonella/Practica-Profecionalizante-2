import jwt from 'jsonwebtoken';

// 🔑 Access Token (Corta duración: 15 min)
export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// 🔄 Refresh Token (Larga duración: ej. 30 días)
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '30d' }
  );
};