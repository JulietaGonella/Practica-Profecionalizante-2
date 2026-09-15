import { Router } from 'express';
import {
  crearAdministrador,
  crearLocalCompleto,
  crearRepartidorCompleto,
  getSolicitudesVehiculos,
  evaluarSolicitudVehiculo,
  getLocalesAdmin,
  actualizarVencimientosVehiculo,
  getAlertasDocumentacion
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';
import { upload } from '../auth/upload.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('administrador'));

router.post('/administradores', crearAdministrador);
router.post('/locales', crearLocalCompleto);
router.post('/repartidores', upload.fields([ { name: 'cedula', maxCount: 1 }, { name: 'seguro', maxCount: 1 }, { name: 'licencia', maxCount: 1 } ]), crearRepartidorCompleto);
router.get('/solicitudes-vehiculos', getSolicitudesVehiculos);
router.put('/solicitudes-vehiculos/:id/evaluar', evaluarSolicitudVehiculo);
router.put('/vehiculos/:id/vencimientos', actualizarVencimientosVehiculo);
router.get('/locales', getLocalesAdmin);
router.get('/admin/alertas-documentacion', authMiddleware, getAlertasDocumentacion);

export default router;