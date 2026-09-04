// src/api/catalogService.js
import api from './axios';

export const getLocales = async () => {
  const { data } = await api.get('/locales');
  return data;
};

export const getProductos = async () => {
  const { data } = await api.get('/products'); // 🟢 COINCIDE CON app.js
  return data;
};

export const getProductoById = async (id) => {
  const { data } = await api.get(`/products/${id}`); // 🟢 COINCIDE CON app.js
  return data;
};