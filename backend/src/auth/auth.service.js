import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { getUserByEmailService } from '../services/users.service.js';
import { generateAccessToken, generateRefreshToken } from './auth.utils.js';
import { enviarEmailRecuperacion } from '../helpers/email.helper.js';

export const loginService = async (email, password, userAgent, ipAddress) => {
  if (!email || !password) {
    throw new Error('Email y password requeridos');
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = await getUserByEmailService(cleanEmail);

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Credenciales inválidas');
  }

  if (
    String(user.rol).toLowerCase() === 'repartidor' &&
    Number(user.repartidor_validado) !== 1
  ) {
    throw new Error(
      'Tu cuenta de repartidor todavía no fue validada por un administrador.'
    );
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const expiraEn = new Date();
  expiraEn.setDate(expiraEn.getDate() + 30);

  await pool.query(
    `INSERT INTO sesiones_usuario (IDusuario, refresh_token_hash, user_agent, ip_address, expira_en)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, refreshTokenHash, userAgent || null, ipAddress || null, expiraEn]
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      rol: user.rol,
      debe_cambiar_pass: Boolean(user.debe_cambiar_pass) // 👈 Retornamos el estado de la bandera
    }
  };
};

export const registerClientService = async (data) => {
  const {
    nombre,
    apellido,
    username,
    email,
    password,
    direccion,
    telefono,
    latitud,
    longitud
  } = data;

  // 1️⃣ Validar presencia de campos requeridos[cite: 42]
  if (!nombre || !apellido || !username || !email || !password || !direccion || !telefono || latitud === undefined || longitud === undefined) {
    throw new Error('Nombre, apellido, username, email, password, dirección, teléfono, latitud y longitud son obligatorios');
  }

  // 2️⃣ Clean up / Trim de cadenas[cite: 42]
  const cleanNombre = String(nombre).trim();
  const cleanApellido = String(apellido).trim();
  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanDireccion = String(direccion).trim();
  const cleanTelefono = String(telefono).trim();

  // 3️⃣ Validar formato de email y contraseña[cite: 42]
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('El formato del correo electrónico no es válido');
  }
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  // 4️⃣ Validar rango numérico de Latitud y Longitud GPS[cite: 42]
  const lat = Number(latitud);
  const lng = Number(longitud);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('La latitud debe ser un número válido entre -90 y 90');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('La longitud debe ser un número válido entre -180 y 180');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[rolCliente]] = await conn.query(
      `SELECT id, nombre FROM roles WHERE LOWER(nombre) = 'cliente'`
    );

    if (!rolCliente) {
      throw new Error('El rol "cliente" no está registrado en la base de datos');
    }

    const ROL_CLIENTE_ID = rolCliente.id;
    const ROL_CLIENTE_NOMBRE = rolCliente.nombre;

    // 5️⃣ Verificar duplicados de manera específica (Username o Email)[cite: 42]
    const [existingUsers] = await conn.query(
      `SELECT username, email FROM usuarios WHERE LOWER(username) = LOWER(?) OR LOWER(email) = ?`,
      [cleanUsername, cleanEmail]
    );

    if (existingUsers.length > 0) {
      const match = existingUsers[0];
      if (match.email.toLowerCase() === cleanEmail) {
        throw new Error('El correo electrónico ya está registrado');
      }
      if (match.username.toLowerCase() === cleanUsername.toLowerCase()) {
        throw new Error('El nombre de usuario ya está registrado');
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [userResult] = await conn.query(
      `INSERT INTO usuarios (nombre, apellido, username, email, password_hash, rol_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanNombre, cleanApellido, cleanUsername, cleanEmail, password_hash, ROL_CLIENTE_ID]
    );

    const IDusuario = userResult.insertId;

    await conn.query(
      `INSERT INTO clientes (IDusuario, telefono, direccion, latitud, longitud)
       VALUES (?, ?, ?, ?, ?)`,
      [IDusuario, cleanTelefono, cleanDireccion, lat, lng]
    );

    await conn.commit();

    return {
      message: 'Cliente registrado con éxito',
      user: {
        id: IDusuario,
        nombre: cleanNombre,
        apellido: cleanApellido,
        username: cleanUsername,
        email: cleanEmail,
        rol: ROL_CLIENTE_NOMBRE
      }
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 🔄 Servicio para refrescar el token cuando expira el Access Token
// auth.service.js
export const refreshTokenService = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('Refresh Token requerido');
  }

  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  let decoded;

  try {
    decoded = jwt.verify(refreshToken, secret);
  } catch (err) {
    throw new Error('Refresh Token expirado o inválido');
  }

  // Buscar sesiones activas del usuario
  const [sesiones] = await pool.query(
    `SELECT * FROM sesiones_usuario 
     WHERE IDusuario = ? AND revocado = 0 AND expira_en > NOW()`,
    [decoded.id]
  );

  if (sesiones.length === 0) {
    throw new Error('Sesión revocada o expirada');
  }

  // Buscar coincidencia de token en las sesiones activas
  let sesionValida = null;
  for (const s of sesiones) {
    const match = await bcrypt.compare(refreshToken, s.refresh_token_hash);
    if (match) {
      sesionValida = s;
      break;
    }
  }

  if (!sesionValida) {
    throw new Error('Refresh Token no coincide con ninguna sesión activa');
  }

  // 🔍 Obtener usuario con estado de validación de repartidor
  const [[user]] = await pool.query(
    `
    SELECT
      u.id,
      r.nombre AS rol,
      r2.validado AS repartidor_validado
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    LEFT JOIN repartidores r2 ON r2.IDusuario = u.id
    WHERE u.id = ?
    `,
    [decoded.id]
  );

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  // 🛡️ Verificar si es repartidor y si está validado
  if (
    String(user.rol).trim().toLowerCase() === 'repartidor' &&
    Number(user.repartidor_validado) !== 1
  ) {
    throw new Error(
      'La cuenta de repartidor no está validada.'
    );
  }

  const newAccessToken = generateAccessToken(user);

  return { accessToken: newAccessToken };
};

// 🚪 Cierre de sesión (Revoca incluso si el JWT de refresh expiró físicamente)[cite: 42]
export const logoutService = async (refreshToken) => {
  if (!refreshToken) throw new Error('Refresh Token requerido');

  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
  let userId = null;

  try {
    const decoded = jwt.verify(refreshToken, secret);
    userId = decoded.id;
  } catch (error) {
    // Si expiro según JWT, intentamos obtener el ID mediante decode insensible[cite: 42]
    const decoded = jwt.decode(refreshToken);
    if (decoded && decoded.id) {
      userId = decoded.id;
    }
  }

  if (userId) {
    const [sesiones] = await pool.query(
      `SELECT id, refresh_token_hash FROM sesiones_usuario WHERE IDusuario = ? AND revocado = 0`,
      [userId]
    );

    for (const s of sesiones) {
      const match = await bcrypt.compare(refreshToken, s.refresh_token_hash);
      if (match) {
        await pool.query(`UPDATE sesiones_usuario SET revocado = 1 WHERE id = ?`, [s.id]);
        break;
      }
    }
  }
};

// 🆕 Servicio para completar el restablecimiento/cambio obligatorio de clave
export const cambiarPasswordObligatorioService = async (userId, nuevaPassword) => {
  if (!nuevaPassword || String(nuevaPassword).length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
  }

  const newHash = await bcrypt.hash(nuevaPassword, 10);

  const [result] = await pool.query(
    `UPDATE usuarios 
     SET password_hash = ?, debe_cambiar_pass = 0 
     WHERE id = ?`,
    [newHash, userId]
  );

  if (result.affectedRows === 0) {
    throw new Error('Usuario no encontrado.');
  }

  return { message: 'Contraseña actualizada correctamente. Ya puedes continuar.' };
};

// 1️⃣ Solicitar token de recuperación y enviar correo/log
export const solicitarRecuperacionPasswordService = async (email) => {
  if (!email) {
    throw new Error('El correo electrónico es requerido.');
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const [[user]] = await pool.query(
    `SELECT id, nombre, email FROM usuarios WHERE LOWER(email) = ?`,
    [cleanEmail]
  );

  // Respuesta genérica para evitar la enumeración de usuarios por ciberseguridad
  if (!user) {
    return { message: 'Si el correo está registrado, recibirás un enlace de recuperación.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(resetToken, 10);
  const expiraEn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await pool.query(
    `INSERT INTO password_resets (IDusuario, token_hash, expira_en) VALUES (?, ?, ?)`,
    [user.id, tokenHash, expiraEn]
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/restablecer-password?token=${resetToken}&id=${user.id}`;

  const previewUrl = await enviarEmailRecuperacion(user.email, resetUrl);

  return {
    message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
    ...(process.env.NODE_ENV !== 'production' && {
      debugInfo: {
        resetUrl,
        emailPreviewUrl: previewUrl || 'Ver consola del servidor'
      }
    })
  };
};

// 2️⃣ Consumir token y actualizar la clave en la BD
export const restablecerPasswordService = async (userId, token, nuevaPassword) => {
  if (!userId || !token || !nuevaPassword) {
    throw new Error('Todos los campos (userId, token, nuevaPassword) son obligatorios.');
  }

  if (String(nuevaPassword).length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
  }

  // Buscar tokens vigentes y no usados para el usuario
  const [tokens] = await pool.query(
    `SELECT id, token_hash FROM password_resets 
     WHERE IDusuario = ? AND usado = 0 AND expira_en > NOW()`,
    [userId]
  );

  if (tokens.length === 0) {
    throw new Error('El enlace de recuperación es inválido o ha expirado.');
  }

  let tokenValido = null;
  for (const t of tokens) {
    const isMatch = await bcrypt.compare(token, t.token_hash);
    if (isMatch) {
      tokenValido = t;
      break;
    }
  }

  if (!tokenValido) {
    throw new Error('El enlace de recuperación es inválido o ha expirado.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const newPasswordHash = await bcrypt.hash(nuevaPassword, 10);

    // Actualizar clave y quitar flag de cambio obligatorio si existiera
    await conn.query(
      `UPDATE usuarios SET password_hash = ?, debe_cambiar_pass = 0 WHERE id = ?`,
      [newPasswordHash, userId]
    );

    // Marcar el token como usado
    await conn.query(
      `UPDATE password_resets SET usado = 1 WHERE id = ?`,
      [tokenValido.id]
    );

    // Revocar todas las sesiones activas del usuario
    await conn.query(
      `UPDATE sesiones_usuario SET revocado = 1 WHERE IDusuario = ?`,
      [userId]
    );

    await conn.commit();
    return { message: 'Contraseña restablecida con éxito. Puedes iniciar sesión con tu nueva clave.' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const cambiarPasswordVoluntarioService = async (userId, passwordActual, nuevaPassword) => {
  if (!passwordActual || !nuevaPassword) {
    throw new Error('Debes ingresar tu contraseña actual y la nueva contraseña.');
  }

  if (String(nuevaPassword).length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
  }

  // 1. Obtener la contraseña actual guardada en BD
  const [[user]] = await pool.query(
    `SELECT password_hash FROM usuarios WHERE id = ?`,
    [userId]
  );

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  // 2. Verificar que la clave actual sea correcta
  const isMatch = await bcrypt.compare(passwordActual, user.password_hash);
  if (!isMatch) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  // 3. Hashear la nueva contraseña y actualizar
  const newHash = await bcrypt.hash(nuevaPassword, 10);
  await pool.query(
    `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
    [newHash, userId]
  );

  return { message: 'Contraseña actualizada con éxito.' };
};