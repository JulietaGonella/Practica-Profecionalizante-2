import {
  crearAdministradorService,
  crearLocalCompletoService,
  crearRepartidorCompletoService
} from '../services/admin.service.js';
import {
  getVehiculosPendientesService,
  revisarVehiculoService
} from '../services/repartidores.service.js';

export const crearAdministrador = async (req, res) => {
  try {
    res.status(201).json(
      await crearAdministradorService(req.body)
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const crearLocalCompleto = async (req, res) => {
  try {
    res.status(201).json(
      await crearLocalCompletoService(req.body)
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const crearRepartidorCompleto = async (req, res) => {
  try {
    res.status(201).json(
      await crearRepartidorCompletoService(req.body)
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getSolicitudesVehiculos = async (req, res) => {
  try {
    const solicitudes = await getVehiculosPendientesService(
      req.query.estado || 'PENDIENTE'
    );
    res.json(solicitudes);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const evaluarSolicitudVehiculo = async (req, res) => {
  try {
    const { estado, motivo_rechazo } = req.body;
    const resultado = await revisarVehiculoService(
      req.params.id,
      estado,
      motivo_rechazo
    );
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};