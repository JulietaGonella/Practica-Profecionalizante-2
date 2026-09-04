// src/api/localService.js
import api from './axios';

// Obtener la información del local asociado al usuario autenticado
export const getMiLocal = async () => {
  const { data } = await api.get('/locales/mi-local');
  return data;
};

// Cambiar el estado activo/inactivo del local (Abrir / Cerrar)
export const toggleEstadoLocal = async (localId) => {
  const { data } = await api.patch(`/locales/${localId}/toggle-activo`);
  return data;
};

// Cambiar el estado operativo del local (Abrir / Cerrar)
export const toggleOperativoLocal = async (localId) => {
  const { data } = await api.patch(`/locales/${localId}/toggle-operativo`);
  return data;
};

// Obtener las órdenes del local (permite filtrar por estado en la query string)
export const getMisPedidosLocal = async (estado) => {
  const params = estado ? { estado } : {};
  const { data } = await api.get('/orders/mis-pedidos-local', { params });
  return data;
};

// Actualizar el estado de los ítems/orden desde el local
export const updateEstadoOrdenLocal = async (ordenId, nuevoEstadoId, detallesIds = [], motivo = null) => {
  const { data } = await api.put(`/orders/${ordenId}/status-local`, {
    IDestado: nuevoEstadoId,
    detallesIds,
    motivo
  });
  return data;
};

export const getHorariosLocal = async () => {
  const { data } = await api.get('/locales/mis-horarios');
  return data;
};

// Actualizar los horarios de atención
export const updateHorariosLocal = async (horarios) => {
  const { data } = await api.put('/locales/mis-horarios', { horarios });
  return data;
};

export const getLocalById = async (id) => {
  const { data } = await api.get(`/locales/${id}`);
  return data;
};

export const searchPedidosHistorial = async (filtros) => {
  const params = new URLSearchParams(filtros).toString();
  const response = await api.get(`/orders/buscar-local?${params}`);
  return response.data;
};

// Modificar los datos permitidos del perfil del local
export const updatePerfilLocal = async (formData) => {
  const { data } = await api.put('/locales/mi-perfil', formData);
  return data;
};