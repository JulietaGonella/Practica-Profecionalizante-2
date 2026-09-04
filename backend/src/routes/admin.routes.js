import { Router } from 'express';
import {
  crearAdministrador,
  crearLocalCompleto,
  crearRepartidorCompleto,
  getSolicitudesVehiculos,
  evaluarSolicitudVehiculo
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/roles.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('administrador'));

router.post('/administradores', crearAdministrador);
router.post('/locales', crearLocalCompleto);
router.post('/repartidores', crearRepartidorCompleto);
router.get('/solicitudes-vehiculos', getSolicitudesVehiculos);
router.put('/solicitudes-vehiculos/:id/evaluar', evaluarSolicitudVehiculo);

export default router;