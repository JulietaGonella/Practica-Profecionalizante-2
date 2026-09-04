import {
  createUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  updateUserRoleService, // 👈 Importar nuevo servicio
  deleteUserService
} from '../services/users.service.js';

export const createUser = async (req, res) => {
  try {
    const user = await createUserService(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getUsers = async (req, res) => {
  const users = await getUsersService();
  res.json(users);
};

export const getUserById = async (req, res) => {
  const user = await getUserByIdService(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(user);
};

export const updateUser = async (req, res) => {
  try {
    const user = await updateUserService(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { rol_id } = req.body;
    if (!rol_id) {
      return res.status(400).json({ error: 'El campo rol_id es requerido' });
    }

    const result = await updateUserRoleService(
      req.params.id,
      rol_id,
      req.user.id
    );
    if (!result) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const result = await deleteUserService(
      req.params.id,
      req.user.id
    );

    if (!result) {
      return res.status(404).json({
        error: 'Usuario no encontrado.'
      });
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};