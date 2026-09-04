import { Router } from 'express';
import {
  getCategoriasComerciales,
  createCategoriaComercial
} from '../controllers/categoriasComerciales.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireAnyRole } from '../auth/roles.middleware.js';

const router = Router();

// 🌐 Obtener catálogo de categorías comerciales (Público/General)
router.get('/', getCategoriasComerciales);

// 🛡️ Crear una nueva categoría comercial
router.post(
  '/',
  authMiddleware,
  requireAnyRole('administrador local', 'local'),
  createCategoriaComercial
);

export default router;