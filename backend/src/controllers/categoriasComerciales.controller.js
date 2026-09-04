import {
  getCategoriasComercialesService,
  createCategoriaComercialService
} from '../services/categoriasComerciales.service.js';

export const getCategoriasComerciales = async (req, res) => {
  try {
    const categorias = await getCategoriasComercialesService();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategoriaComercial = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const nuevaCategoria = await createCategoriaComercialService(nombre, descripcion);
    res.status(201).json(nuevaCategoria);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};