import { Router } from 'express';
import { 
  getAdminDashboard, 
  getFlotaDashboard, 
  getRepartidorIndividualDashboard, 
  getClienteMeDashboard 
} from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole, requireAnyRole } from '../auth/roles.middleware.js';

const router = Router();

// 1. General - Administrador
router.get('/admin', authMiddleware, requireRole('administrador'), getAdminDashboard);

// 2. Gestión General de Repartidores
router.get('/repartidores', authMiddleware, requireRole('administrador'), getFlotaDashboard);

// 3. Vista Individual del Repartidor
router.get('/repartidores/:id', authMiddleware, requireAnyRole('administrador', 'repartidor'), getRepartidorIndividualDashboard);

// 4. Vista de Perfil e Historial del Cliente Logueado
router.get('/clientes/me', authMiddleware, requireRole('cliente'), getClienteMeDashboard);

export default router;