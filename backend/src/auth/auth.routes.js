import { Router } from 'express';
import { login, refreshToken, logout, registerClient } from './auth.controller.js'; // 👈 Agregar registerClient

const router = Router();

router.post('/register', registerClient); // 👈 Nuevo endpoint público para clientes
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;