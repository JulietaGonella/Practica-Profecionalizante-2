import api from './axios';

// ==========================================
// CREACIÓN COMPUESTA (TRANSACCIONAL)
// ==========================================

export const crearLocalCompletoAdmin = async (payload) => {
  const { data } = await api.post('/admin/locales', payload);
  return data;
};

export const crearRepartidorCompletoAdmin = async (formData) => {
  // Axios procesará automáticamente el FormData sin necesidad de forzar headers
  const { data } = await api.post('/admin/repartidores', formData);
  return data;
};

export const crearAdministradorAdmin = async (payload) => {
  const { data } = await api.post('/admin/administradores', payload);
  return data;
};

// ==========================================
// CONSULTAS Y GESTIÓN
// ==========================================

export const getRolesAdmin = async () => {
  const { data } = await api.get('/roles');
  return data;
};

export const getUsuariosAdmin = async () => {
  const { data } = await api.get('/users');
  return data;
};

export const getRepartidoresAdmin = async () => {
  const { data } = await api.get('/repartidores');
  return data;
};

export const getLocalesAdmin = async () => {
  const { data } = await api.get('/admin/locales');
  return data;
};

export const getClientesAdmin = async () => {
  const { data } = await api.get('/clientes');
  return data;
};

export const getHorariosLocalAdmin = async (localId) => {
  const { data } = await api.get(`/locales/${localId}/horarios`);
  return data;
};

export const actualizarLocalAdmin = async (localId, datos) => {
  const { data } = await api.put(`/locales/${localId}`, datos);
  return data;
};

export const toggleActivoLocalAdmin = async (localId) => {
  const { data } = await api.patch(`/locales/${localId}/toggle-activo`);
  return data;
};

export const validarRepartidorAdmin = async (id, validado) => {
  const { data } = await api.put(`/repartidores/${id}/validar`, { validado });
  return data;
};

export const eliminarUsuarioAdmin = async (usuarioId) => {
  const { data } = await api.delete(`/users/${usuarioId}`);
  return data;
};

export const getSolicitudesVehiculosAdmin = async (estado = 'PENDIENTE') => {
  const { data } = await api.get(`/admin/solicitudes-vehiculos?estado=${estado}`);
  return data;
};

export const evaluarSolicitudVehiculoAdmin = async (id, estado, motivo_rechazo = '') => {
  const { data } = await api.put(`/admin/solicitudes-vehiculos/${id}/evaluar`, {
    estado,
    motivo_rechazo
  });
  return data;
};

export const getHistorialClienteAdmin = async (clienteUserId) => {
  const { data } = await api.get(`/clientes/${clienteUserId}/historial`);
  return data;
};

export const getAlertasDocumentacionAdmin = async () => {
  const { data } = await api.get('/admin/alertas-documentacion');
  return data;
};

// Obtener vehículos con solicitud de baja pendiente
export const getVehiculosPendientesBajaAdmin = async () => {
  const { data } = await api.get('/admin/vehiculos-pendientes-baja');
  return data;
};

// Aprobar la baja definitiva del vehículo
export const aprobarBajaVehiculoAdmin = async (idVehiculo) => {
  const { data } = await api.patch(`/admin/vehiculos/${idVehiculo}/aprobar-baja`);
  return data;
};

// Rechazar la baja definitiva del vehículo
export const rechazarBajaVehiculoAdmin = async (idVehiculo, motivo) => {
  const { data } = await api.patch(`/admin/vehiculos/${idVehiculo}/rechazar-baja`, { motivo });
  return data;
};