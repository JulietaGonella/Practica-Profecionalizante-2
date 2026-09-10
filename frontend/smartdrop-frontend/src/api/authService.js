import api from './axios';

export const cambiarPasswordInicialApi = async (nuevaPassword) => {
  const { data } = await api.post('/auth/cambiar-password-inicial', { nuevaPassword });
  return data;
};

// 1. Solicitar recuperación (Email con enlace/token)
export const solicitarRecuperacionApi = async (email) => {
  const { data } = await api.post('/auth/solicitar-recuperacion', { email });
  return data;
};

// 2. Restablecer contraseña con Token
export const restablecerPasswordApi = async (userId, token, nuevaPassword) => {
  const { data } = await api.post('/auth/restablecer-password', {
    userId,
    token,
    nuevaPassword
  });
  return data;
};

export const cambiarPasswordVoluntarioApi = async (passwordActual, nuevaPassword) => {
  const { data } = await api.post('/auth/cambiar-password', {
    passwordActual,
    nuevaPassword
  });
  return data;
};