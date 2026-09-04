// src/api/ordersService.js
import api from './axios';

// 🟢 Crear un nuevo pedido
export const crearOrden = async (orderPayload) => {
  const { data } = await api.post('/orders', orderPayload);
  return data;
};

export const getMisPedidos = async () => {
  const { data } = await api.get('/orders/mis-pedidos');
  return data;
};

export const cancelarPedido = async (ordenId, motivo) => {
  const { data } = await api.put(`/orders/${ordenId}/cancel`, { motivo });
  return data;
};

// ⭐️ Calificar una orden entregada
export const calificarPedido = async (ordenId, puntaje) => {
  const { data } = await api.put(`/orders/${ordenId}/calificar`, { puntaje });
  return data;
};

// src/api/ordersService.js
export const getPedidoById = async (ordenId) => {
  const { data } = await api.get(`/orders/${ordenId}`);
  return data;
};

export const getOrderTracking = async (ordenId) => {
  const { data } = await api.get(`/orders/${ordenId}/tracking`);
  return data;
};