import { Router } from 'express';
import { 
  login, 
  refreshToken, 
  logout, 
  registerClient,
  cambiarPasswordObligatorio,
  solicitarRecuperacionPassword,
  restablecerPassword
} from './auth.controller.js';
import { authMiddleware } from './auth.middleware.js';

const router = Router();

router.post('/register', registerClient); // 👈 Nuevo endpoint público para clientes
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/cambiar-password-inicial', authMiddleware, cambiarPasswordObligatorio);
router.post('/solicitar-recuperacion', solicitarRecuperacionPassword);
router.post('/restablecer-password', restablecerPassword);

export default router;