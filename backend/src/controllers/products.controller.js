import {
  createProductService,
  getProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  toggleDisponibleProductService,
  toggleDisponibleOpcionService
} from '../services/products.service.js';

export const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const productData = { ...req.body };

    // Si se subió un archivo, genera la URL pública
    if (req.file) {
      productData.imagen_url = `/uploads/${req.file.filename}`;
    }

    // Convertir JSON strings que vienen de FormData
    if (typeof productData.ingredientes === 'string') {
      productData.ingredientes = JSON.parse(productData.ingredientes);
    }
    if (typeof productData.grupos_opciones === 'string') {
      productData.grupos_opciones = JSON.parse(productData.grupos_opciones);
    }

    const product = await createProductService(productData, userId);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  const products = await getProductsService();
  res.json(products);
};

export const getProductById = async (req, res) => {
  const product = await getProductByIdService(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
};

export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = { ...req.body };

    // Si se subió una nueva imagen, actualiza la propiedad
    if (req.file) {
      updateData.imagen_url = `/uploads/${req.file.filename}`;
    }

    // Convertir JSON strings
    if (typeof updateData.ingredientes === 'string') {
      updateData.ingredientes = JSON.parse(updateData.ingredientes);
    }
    if (typeof updateData.grupos_opciones === 'string') {
      updateData.grupos_opciones = JSON.parse(updateData.grupos_opciones);
    }

    const product = await updateProductService(req.params.id, updateData, userId);
    
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteProductService(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const toggleDisponibleProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id; // Asumiendo que authMiddleware guarda el usuario aquí

    const result = await toggleDisponibleProductService(productId, userId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const toggleDisponibleOpcion = async (req, res) => {
  try {
    const { opcionId } = req.params;
    const userId = req.user.id;
    const result = await toggleDisponibleOpcionService(opcionId, userId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};