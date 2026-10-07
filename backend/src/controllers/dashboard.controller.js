// src/controllers/dashboard.controller.js
import { getDashboardMetricsService } from '../services/admin.service.js';
import { getFlotaDashboardService, getMiTableroRepartidorService } from '../services/repartidoresDashboard.service.js';
import { getClienteMeDashboardService } from '../services/clientesDashboard.service.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const data = await getDashboardMetricsService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFlotaDashboard = async (req, res) => {
  try {
    const data = await getFlotaDashboardService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMiTableroRepartidor = async (req, res) => {
  try {
    const IDusuario = req.user.id; // O según tu middleware de autenticación (req.usuario.id)
    const { fechaInicio, fechaFin } = req.query;

    const data = await getMiTableroRepartidorService(IDusuario, { fechaInicio, fechaFin });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al obtener el tablero del repartidor' });
  }
};

export const getClienteMeDashboard = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const data = await getClienteMeDashboardService(IDusuario, req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al obtener el tablero del cliente' });
  }
};