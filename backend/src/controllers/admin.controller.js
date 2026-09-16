import {
  crearAdministradorService,
  crearLocalCompletoService,
  crearRepartidorCompletoService,
  getLocalesAdminService,
  actualizarVencimientosVehiculoService,
  getAlertasDocumentacionVencidaService,
  getVehiculosPendientesBajaService, // 👈 Nuevo
  aprobarBajaVehiculoService,
  rechazarBajaVehiculoService
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

// controllers/admin.controller.js
export const crearRepartidorCompleto = async (req, res) => {
  try {
    const resultado = await crearRepartidorCompletoService(req.body, req.files || {});
    res.status(201).json(resultado);
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

export const getLocalesAdmin = async (req, res) => {
  try {
    const locales = await getLocalesAdminService();
    res.json(locales);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const actualizarVencimientosVehiculo = async (req, res) => {
  try {
    const resultado = await actualizarVencimientosVehiculoService(req.params.id, req.body);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAlertasDocumentacion = async (req, res) => {
  try {
    const alertas = await getAlertasDocumentacionVencidaService();
    res.json(alertas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVehiculosPendientesBaja = async (req, res) => {
  try {
    const vehiculos = await getVehiculosPendientesBajaService();
    res.json(vehiculos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const aprobarBajaVehiculoAdmin = async (req, res) => {
  try {
    const { id } = req.params; // ID del vehículo
    const resultado = await aprobarBajaVehiculoService(id);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const rechazarBajaVehiculoAdmin = async (req, res) => {
  try {
    const { id } = req.params; // ID del vehículo
    const { motivo_rechazo } = req.body;
    
    const resultado = await rechazarBajaVehiculoService(id, motivo_rechazo);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};