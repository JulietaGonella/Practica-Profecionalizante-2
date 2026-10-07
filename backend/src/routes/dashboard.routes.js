import { Router } from 'express';
import { 
  getAdminDashboard, 
  getFlotaDashboard, 
  getMiTableroRepartidor, 
  getClienteMeDashboard 
} from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole, requireAnyRole } from '../auth/roles.middleware.js';

const router = Router();

// 1. General - Administrador
router.get('/admin', authMiddleware, requireRole('administrador'), getAdminDashboard);

// 2. Gestión General de Repartidores
router.get('/repartidores', authMiddleware, requireRole('administrador'), getFlotaDashboard);

// 3. Vista Individual del Repartidor (SE AGREGA authMiddleware)
router.get('/mi-tablero', authMiddleware, requireRole('repartidor'), getMiTableroRepartidor);

// 4. Vista de Perfil e Historial del Cliente Logueado
router.get('/clientes/me', authMiddleware, requireRole('cliente'), getClienteMeDashboard);

export default router;