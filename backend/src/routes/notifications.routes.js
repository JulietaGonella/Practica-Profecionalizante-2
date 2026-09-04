import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notifications.controller.js';

const router = Router();

// Todas las rutas requieren token de autenticación
router.get('/', authMiddleware, getMyNotifications);
router.patch('/:id/read', authMiddleware, markAsRead);
router.patch('/read-all', authMiddleware, markAllAsRead);

export default router;