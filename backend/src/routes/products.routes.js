import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  toggleDisponibleProduct,
  toggleDisponibleOpcion
} from '../controllers/products.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireAnyRole, requireRole } from '../auth/roles.middleware.js';
import { upload } from '../auth/upload.middleware.js';

const router = Router();

// 🌐 Rutas Públicas
router.get('/', getProducts);
router.get('/:id', getProductById);

// 🛡️ Creación y Edición: Únicamente locales / admins locales
router.post(
  '/', 
  authMiddleware, 
  requireAnyRole('administrador local', 'local'),
  upload.single('imagen'), // 👈 OBLIGATORIO
  createProduct
);

router.put(
  '/:id', 
  authMiddleware, 
  requireAnyRole('administrador local', 'local'),
  upload.single('imagen'), // 👈 AGREGAR AQUÍ PARA EDITAR CON IMAGEN
  updateProduct
);

router.patch(
  '/:id/toggle-disponible',
  authMiddleware,
  requireAnyRole('administrador local', 'local'),
  toggleDisponibleProduct
);

router.patch(
  '/opciones/:opcionId/toggle-disponible',
  authMiddleware,
  requireAnyRole('administrador local', 'local'),
  toggleDisponibleOpcion
);

// 🛡️ Eliminación (Moderación de contenido): Únicamente Administrador General
router.delete(
  '/:id',
  authMiddleware,
  requireRole('administrador'),
  deleteProduct
);

export default router;