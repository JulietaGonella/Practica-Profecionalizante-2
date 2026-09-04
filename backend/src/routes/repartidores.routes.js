import { Router } from 'express';
import { 
  simularRecorrido, 
  createRepartidor, 
  getTiposVehiculo, 
  addVehiculo,
  validarRepartidor, // 👈 Importar
  updateUbicacion,
  getDisponibilidad,
  updateDisponibilidad,
  getMisVehiculos,
  solicitarVehiculo,
  seleccionarVehiculoActivo,
  getVehiculosPendientes,
  revisarVehiculo,
  getRepartidoresAdmin,
  getMiPerfilRepartidor
} from '../controllers/repartidores.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';
import { requireRepartidorValidado } from '../auth/repartidorValidado.middleware.js';
import { uploadDocumentos } from '../auth/upload.middleware.js';

const router = Router();

router.get('/tipos-vehiculo', getTiposVehiculo);
router.post('/', authMiddleware, requireRole('administrador'), createRepartidor);
router.post('/:id/vehiculos', authMiddleware, requireRole('administrador'), addVehiculo);
router.post('/:id/simular-recorrido', authMiddleware, requireRole('repartidor'), requireRepartidorValidado, simularRecorrido);

// 🛡️ PUT /repartidores/:id/validar -> Aprobación de repartidor (Solo Admin)
router.put('/:id/validar', authMiddleware, requireRole('administrador'), validarRepartidor);

// Endpoint dedicado de GPS / Heartbeat
router.patch('/ubicacion', authMiddleware, requireRole('repartidor'), updateUbicacion);
router.get('/mi-disponibilidad', authMiddleware, requireRole('repartidor'), getDisponibilidad);
router.patch('/mi-disponibilidad', authMiddleware, requireRole('repartidor'), updateDisponibilidad);

router.get('/mis-vehiculos', authMiddleware, requireRole('repartidor'), getMisVehiculos);
router.get('/me/vehiculos', authMiddleware, requireRole('repartidor'), getMisVehiculos);
router.post(
  '/mis-vehiculos',
  authMiddleware,
  requireRole('repartidor'),
  uploadDocumentos.fields([
    { name: 'cedula', maxCount: 1 },
    { name: 'seguro', maxCount: 1 },
    { name: 'licencia', maxCount: 1 }
  ]),
  solicitarVehiculo
);
router.post(
  '/me/solicitud-vehiculo',
  authMiddleware,
  requireRole('repartidor'),
  uploadDocumentos.fields([
    { name: 'cedula', maxCount: 1 },
    { name: 'seguro', maxCount: 1 },
    { name: 'licencia', maxCount: 1 }
  ]),
  solicitarVehiculo
);
router.patch('/mis-vehiculos/:id/activo', authMiddleware, requireRole('repartidor'), seleccionarVehiculoActivo);
router.put('/me/vehiculo-activo', authMiddleware, requireRole('repartidor'), seleccionarVehiculoActivo);

router.get('/vehiculos-pendientes', authMiddleware, requireRole('administrador'), getVehiculosPendientes);
router.patch('/vehiculos/:id/revision', authMiddleware, requireRole('administrador'), revisarVehiculo);

router.get('/me/perfil', authMiddleware, requireRole('repartidor'), getMiPerfilRepartidor);

router.get('/', authMiddleware, requireRole('administrador'), getRepartidoresAdmin);

export default router;