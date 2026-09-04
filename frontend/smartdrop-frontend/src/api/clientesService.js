import api from './axios';

export const getMiPerfil = async () => {
  const { data } = await api.get('/clientes/mi-perfil');
  return data;
};

export const updateMiPerfil = async (perfilData) => {
  const { data } = await api.put('/clientes/mi-perfil', perfilData);
  return data;
};

// 🟢 Obtener lista de direcciones guardadas
export const getMisDirecciones = async () => {
  const { data } = await api.get('/clientes/mis-direcciones');
  return data;
};

// Crear una nueva dirección (soporta GPS u origen manual)
export const createMiDireccion = async (direccionData) => {
  const { data } = await api.post('/clientes/mis-direcciones', direccionData);
  return data;
};

// Eliminar una dirección
export const deleteMiDireccion = async (id) => {
  const { data } = await api.delete(`/clientes/mis-direcciones/${id}`);
  return data;
};