import {
  getClientesService,
  getPerfilClienteService,
  updatePerfilClienteService,
  getDireccionesClienteService,
  createDireccionClienteService,
  deleteDireccionClienteService
} from '../services/clientes.service.js';

export const getClientes = async (req, res) => {
  try {
    const clientes = await getClientesService();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMiPerfil = async (req, res) => {
  try {
    const perfil = await getPerfilClienteService(req.user.id);
    res.json(perfil);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const updateMiPerfil = async (req, res) => {
  try {
    const perfilActualizado = await updatePerfilClienteService(req.user.id, req.body);
    res.json({ message: 'Perfil actualizado exitosamente', perfil: perfilActualizado });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMisDirecciones = async (req, res) => {
  try {
    const direcciones = await getDireccionesClienteService(req.user.id);
    res.json(direcciones);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const createMisDirecciones = async (req, res) => {
  try {
    const nuevaDireccion = await createDireccionClienteService(req.user.id, req.body);
    res.status(201).json(nuevaDireccion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteMisDirecciones = async (req, res) => {
  try {
    const result = await deleteDireccionClienteService(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};