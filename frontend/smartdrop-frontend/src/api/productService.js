import api from './axios';

// Obtener los productos del local autenticado (o catálogo general)
export const getProductos = async () => {
  const { data } = await api.get('/products');
  return data;
};

export const createProducto = async (productoData) => {
  const { data } = await api.post('/products', productoData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const updateProducto = async (id, productoData) => {
  const { data } = await api.put(`/products/${id}`, productoData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

// Cambiar estado disponible/pausado
export const toggleDisponibleProducto = async (id) => {
  const { data } = await api.patch(`/products/${id}/toggle-disponible`);
  return data;
};

// Obtener todas las categorías comerciales
export const getCategoriasComerciales = async () => {
  const { data } = await api.get('/categorias-comerciales');
  return data;
};

// Crear una nueva categoría comercial
export const createCategoriaComercial = async (categoriaData) => {
  const { data } = await api.post('/categorias-comerciales', categoriaData);
  return data;
};

export const toggleDisponibleOpcion = async (opcionId) => {
  const res = await api.patch(`/products/opciones/${opcionId}/toggle-disponible`);
  return res.data;
};