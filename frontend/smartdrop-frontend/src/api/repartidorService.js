import api from './axios';

export const getPedidosDisponibles = async () => {
  const { data } = await api.get('/orders/disponibles');
  return data.orders || data || [];
};

export const getMisPedidosAsignados = async () => {
  const { data } = await api.get('/orders/mis-asignados');
  return data || [];
};

export const aceptarPedidoRepartidor = async (ordenId) => {
  const { data } = await api.put(`/orders/${ordenId}/accept`);
  return data;
};

export const simularRecorridoPedido = async (repartidorId, ordenId) => {
  const { data } = await api.post(`/repartidores/${repartidorId}/simular-recorrido`, {
    IDorden: ordenId
  });
  return data;
};

export const entregarPedido = async (ordenId, codigoOtp) => {
  const { data } = await api.put(`/orders/${ordenId}/entregar`, {
    codigo_otp: codigoOtp
  });
  return data;
};

export const getPedidoAsignado = async (ordenId) => {
  const { data } = await api.get(`/orders/asignados/${ordenId}`);
  return data;
};

export const getOrderTracking = async (ordenId) => {
  const { data } = await api.get(`/orders/${ordenId}/tracking`);
  return data;
};

export const getDisponibilidadRepartidor = async () => {
  const { data } = await api.get('/repartidores/mi-disponibilidad');
  return data;
};

export const actualizarDisponibilidadRepartidor = async (disponible) => {
  const { data } = await api.patch('/repartidores/mi-disponibilidad', { disponible });
  return data;
};

export const getMisVehiculos = async () => {
  const { data } = await api.get('/repartidores/me/vehiculos');
  return data;
};

export const solicitarVehiculo = async (formData) => {
  const { data } = await api.post('/repartidores/me/solicitud-vehiculo', formData);
  return data;
};

export const seleccionarVehiculoActivo = async (IDvehiculo) => {
  const { data } = await api.put('/repartidores/me/vehiculo-activo', { IDvehiculo });
  return data;
};

// api/repartidorService.js
export const getMiPerfilRepartidor = async () => {
  const response = await api.get('/repartidores/me/perfil');
  return response.data;
};

export const liberarPedidoRepartidor = async (ordenId, motivo = '') => {
  const { data } = await api.put(`/orders/${ordenId}/liberar`, { motivo });
  return data;
};

export const confirmarRetiroLocal = async (ordenId, payload) => {
  // payload: { IDlocal }
  const response = await api.put(`/orders/${ordenId}/confirmar-retiro`, payload);
  return response.data;
};

export const getResumenGananciasHoy = async () => {
  const { data } = await api.get('/repartidores/ganancias-hoy');
  return data;
};