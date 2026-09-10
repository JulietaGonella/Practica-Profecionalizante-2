import { 
  loginService, 
  refreshTokenService, 
  logoutService, 
  registerClientService,
  cambiarPasswordObligatorioService,
  solicitarRecuperacionPasswordService,
  restablecerPasswordService,
  cambiarPasswordVoluntarioService
} from './auth.service.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await loginService(email, password, userAgent, ipAddress);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await refreshTokenService(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Validar en el controller que envíen el token[cite: 42]
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh Token requerido' });
    }

    await logoutService(refreshToken);
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const registerClient = async (req, res) => {
  try {
    const result = await registerClientService(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const cambiarPasswordObligatorio = async (req, res) => {
  try {
    const { nuevaPassword } = req.body;
    const userId = req.user.id; // Obtenido desde el authMiddleware

    const result = await cambiarPasswordObligatorioService(userId, nuevaPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const solicitarRecuperacionPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await solicitarRecuperacionPasswordService(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const restablecerPassword = async (req, res) => {
  try {
    const { userId, token, nuevaPassword } = req.body;
    const result = await restablecerPasswordService(userId, token, nuevaPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const cambiarPasswordVoluntario = async (req, res) => {
  try {
    const { passwordActual, nuevaPassword } = req.body;
    const userId = req.user.id; // Obtenido del token por authMiddleware

    const result = await cambiarPasswordVoluntarioService(userId, passwordActual, nuevaPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};