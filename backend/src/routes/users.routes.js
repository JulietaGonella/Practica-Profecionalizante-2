import { Router } from 'express';
import {
  //createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser
} from '../controllers/users.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js'; // 👈 Importar autenticación
import { requireRole } from '../auth/roles.middleware.js';  // 👈 Importar validación de roles

const router = Router();

// 🛡️ Aplicar seguridad global al grupo de rutas de usuarios
router.use(authMiddleware);
router.use(requireRole('administrador')); // Solo la Administradora/Admin puede acceder aquí

//router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.patch('/:id/rol', updateUserRole); // 👈 Endpoint PATCH /users/:id/rol
router.delete('/:id', deleteUser);

export default router;