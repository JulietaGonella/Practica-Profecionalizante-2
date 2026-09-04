// src/controllers/locales.controller.js
import {
  createLocalService,
  getLocalesService,
  getLocalByIdService,
  getLocalByUserIdService,
  toggleActivoLocalService,
  updateLocalService,
  getMisHorariosService,     // 👈 Nuevo
  updateMisHorariosService,   // 👈 Nuevo
  getHorariosByLocalIdService,
  toggleOperativoLocalService,
  updatePerfilLocalService
} from '../services/locales.service.js';

export const getMiLocal = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const local = await getLocalByUserIdService(IDusuario);

    if (!local) {
      return res.status(404).json({ error: 'No se encontró ningún local asociado a este usuario.' });
    }

    res.json(local);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const createLocal = async (req, res) => {
  try {
    const local = await createLocalService(req.body);
    res.status(201).json(local);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getLocales = async (req, res) => {
  const locales = await getLocalesService();
  res.json(locales);
};

export const getLocalById = async (req, res) => {
  const local = await getLocalByIdService(req.params.id);
  if (!local) {
    return res.status(404).json({ error: 'Local no encontrado' });
  }
  res.json(local);
};

export const updateLocal = async (req, res) => {
  try {
    const local = await updateLocalService(req.params.id, req.body);
    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    res.json(local);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const toggleActivoLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const IDusuario = req.user.id;
    const rolUsuario = req.user.rol;

    const result = await toggleActivoLocalService(id, IDusuario, rolUsuario);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMisHorarios = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const horarios = await getMisHorariosService(IDusuario);
    res.json(horarios);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateMisHorarios = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const { horarios } = req.body;
    const result = await updateMisHorariosService(IDusuario, horarios);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getHorariosByLocalId = async (req, res) => {
  try {
    const { id } = req.params;
    const horarios = await getHorariosByLocalIdService(id);
    res.json(horarios);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const toggleOperativoLocal = async (req, res) => {
  try {
    const resultado = await toggleOperativoLocalService(
      req.params.id,
      req.user.id
    );

    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateMiPerfilLocal = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const bodyData = { ...req.body };

    // Asignar rutas públicas si se subió algún archivo
    if (req.files?.logo) bodyData.logo_url = `/uploads/${req.files.logo[0].filename}`;
    if (req.files?.banner) bodyData.banner_url = `/uploads/${req.files.banner[0].filename}`;
    if (req.files?.foto) bodyData.foto_url = `/uploads/${req.files.foto[0].filename}`;

    const resultado = await updatePerfilLocalService(IDusuario, bodyData);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};