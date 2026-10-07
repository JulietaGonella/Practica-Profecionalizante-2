// src/api/notificationsService.js
import api from './axios';

// Obtener notificaciones del cliente
export const getMisNotificaciones = async () => {
  const { data } = await api.get('/notificaciones');
  return data;
};

// Marcar notificación individual como leída
export const marcarNotificacionLeida = async (id) => {
  const { data } = await api.patch(`/notificaciones/${id}/read`);
  return data;
};

// Marcar todas como leídas
export const marcarTodasComoLeidas = async () => {
  const { data } = await api.patch('/notificaciones/read-all');
  return data;
};