import { Router } from 'express';
import {
  createLocal,
  getLocales,
  getLocalById,
  getMiLocal,
  updateLocal,
  toggleActivoLocal,
  getMisHorarios,    // 👈 Importar
  updateMisHorarios,  // 👈 Importar
  getHorariosByLocalId,
  toggleOperativoLocal,
  updateMiPerfilLocal
} from '../controllers/locales.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole, requireAnyRole } from '../auth/roles.middleware.js';
import { upload } from '../auth/upload.middleware.js';

const router = Router();

// Públicas
router.get('/', getLocales);

// Protegidas del Local
router.get('/mi-local', authMiddleware, requireAnyRole('administrador local', 'local'), getMiLocal);

// 🗓️ Gestión de horarios del local autenticado
router.get('/mis-horarios', authMiddleware, requireAnyRole('administrador local', 'local'), getMisHorarios);
router.put('/mis-horarios', authMiddleware, requireAnyRole('administrador local', 'local'), updateMisHorarios);

// ✏️ Actualizar perfil del local autenticado
router.put(
  '/mi-perfil', authMiddleware, requireAnyRole('administrador local', 'local'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'foto', maxCount: 1 }
  ]),
  updateMiPerfilLocal
);

// Rutas administrativas generales
router.post('/', authMiddleware, requireRole('administrador'), createLocal);
router.put('/:id', authMiddleware, requireRole('administrador'), updateLocal);
router.patch('/:id/toggle-activo', authMiddleware, requireAnyRole('administrador'), toggleActivoLocal);
router.patch('/:id/toggle-operativo', authMiddleware, requireAnyRole('administrador local', 'local'), toggleOperativoLocal);

// Ruta pública para clientes o el mapa principal
router.get('/:id/horarios', getHorariosByLocalId);

// Obtener local por ID
router.get('/:id', getLocalById);

export default router;