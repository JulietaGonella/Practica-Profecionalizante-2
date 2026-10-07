import api from './axios';

// Obtener datos del Tablero General Admin
export const getAdminDashboardApi = async (params = {}) => {
  const response = await api.get('/dashboard/admin', { params });
  return response.data;
};

// Obtener datos del Tablero de Gestión de Repartidores
export const getFlotaDashboardApi = async (params = {}) => {
  const response = await api.get('/dashboard/repartidores', { params });
  return response.data;
};

export const getMiTableroRepartidor = async (params) => {
  const response = await api.get('/dashboard/mi-tablero', { params });
  return response.data;
};

// Obtener datos del Tablero General del Cliente
export const getClienteDashboardApi = async (params = {}) => {
  const response = await api.get('/dashboard/clientes/me', { params });
  return response.data;
};