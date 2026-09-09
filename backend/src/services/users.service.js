import { pool } from '../config/db.js';
import bcrypt from 'bcrypt';

export const createUserService = async (data) => {
  const { username, email, password, rol_id } = data;

  if (!username || !email || !password || !rol_id) {
    throw new Error('Faltan campos obligatorios (username, email, password, rol_id)');
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  const [existing] = await pool.query(
    `SELECT id FROM usuarios WHERE LOWER(username) = LOWER(?) OR LOWER(email) = ?`,
    [cleanUsername, cleanEmail]
  );

  if (existing.length > 0) {
    throw new Error('El username o correo electrónico ya se encuentra registrado');
  }

  const [[rol]] = await pool.query(`SELECT id FROM roles WHERE id = ?`, [rol_id]);
  if (!rol) {
    throw new Error('El rol especificado no existe');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO usuarios (username, email, password_hash, rol_id) VALUES (?, ?, ?, ?)`,
    [cleanUsername, cleanEmail, password_hash, rol_id]
  );

  return {
    id: result.insertId,
    username: cleanUsername,
    email: cleanEmail,
    rol_id,
    message: 'Usuario creado exitosamente'
  };
};

export const getUsersService = async () => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.rol_id, r.nombre AS rol, u.creado_en
     FROM usuarios u
     JOIN roles r ON u.rol_id = r.id`
  );
  return rows;
};

export const getUserByIdService = async (id) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.rol_id, r.nombre AS rol, u.creado_en
     FROM usuarios u
     JOIN roles r ON u.rol_id = r.id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
};

export const getUserByEmailService = async (email) => {
  const [[user]] = await pool.query(
    `
    SELECT 
      u.id, 
      u.username, 
      u.nombre, 
      u.apellido, 
      u.email, 
      u.password_hash, 
      u.debe_cambiar_pass,
      r.nombre AS rol,
      rep.validado AS repartidor_validado
    FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    LEFT JOIN repartidores rep ON rep.IDusuario = u.id
    WHERE LOWER(u.email) = LOWER(?)
    `,
    [email]
  );

  return user;
};

export const updateUserService = async (id, data) => {
  const { username, email, password } = data;

  const [[user]] = await pool.query(
    `SELECT id FROM usuarios WHERE id = ?`,
    [id]
  );

  if (!user) return null;

  const cleanUsername =
    username !== undefined && username !== null
      ? String(username).trim()
      : null;

  const cleanEmail =
    email !== undefined && email !== null
      ? String(email).trim().toLowerCase()
      : null;

  if (cleanUsername || cleanEmail) {
    const [[duplicado]] = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE id <> ?
        AND (
          LOWER(username) = LOWER(?)
          OR LOWER(email) = ?
        )
      `,
      [
        id,
        cleanUsername || '',
        cleanEmail || ''
      ]
    );

    if (duplicado) {
      throw new Error(
        'El username o email ya pertenece a otro usuario.'
      );
    }
  }

  let passwordHash = null;

  if (password !== undefined && password !== null && password !== '') {
    if (String(password).length < 8) {
      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );
    }

    passwordHash = await bcrypt.hash(String(password), 10);
  }

  await pool.query(
    `
    UPDATE usuarios
    SET
      username = COALESCE(?, username),
      email = COALESCE(?, email),
      password_hash = COALESCE(?, password_hash)
    WHERE id = ?
    `,
    [
      cleanUsername || null,
      cleanEmail || null,
      passwordHash,
      id
    ]
  );

  return {
    message: 'Usuario actualizado correctamente.'
  };
};

export const updateUserRoleService = async () => {
  throw new Error(
    'El cambio de roles está deshabilitado. Cree una cuenta nueva con el perfil correspondiente.'
  );
};

export const deleteUserService = async (id, administradorId) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (Number(id) === Number(administradorId)) {
      throw new Error('No podés eliminar tu propia cuenta.');
    }

    const [[user]] = await conn.query(
      `
      SELECT u.id, r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ?
      `,
      [id]
    );

    if (!user) return null;

    if (user.rol.toLowerCase() === 'administrador') {
      const [[cantidad]] = await conn.query(
        `
        SELECT COUNT(*) AS total
        FROM usuarios u
        JOIN roles r ON r.id = u.rol_id
        WHERE LOWER(r.nombre) = 'administrador'
        `
      );

      if (Number(cantidad.total) <= 1) {
        throw new Error(
          'No se puede eliminar el último administrador.'
        );
      }
    }

    await conn.query(`DELETE FROM usuarios WHERE id = ?`, [id]);

    await conn.commit();

    return {
      message: 'Usuario eliminado correctamente.'
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
