import { Router } from 'express';
import { getClientes, 
    getMiPerfil, 
    updateMiPerfil,
    getMisDirecciones, 
    createMisDirecciones, 
    deleteMisDirecciones
} from '../controllers/clientes.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole, requireAnyRole } from '../auth/roles.middleware.js';

const router = Router();

router.get('/', authMiddleware, requireRole('administrador'), getClientes);
router.get('/mi-perfil', authMiddleware, getMiPerfil);
router.put('/mi-perfil', authMiddleware, updateMiPerfil); 
router.get('/mis-direcciones', authMiddleware, getMisDirecciones);
router.post('/mis-direcciones', authMiddleware, createMisDirecciones);
router.delete('/mis-direcciones/:id', authMiddleware, deleteMisDirecciones);

export default router;