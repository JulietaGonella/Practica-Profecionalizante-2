import { getDashboardMetricsService } from '../services/admin.service.js';
import { getFlotaDashboardService, getRepartidorIndividualDashboardService } from '../services/repartidoresDashboard.service.js';
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
    const data = await getFlotaDashboardService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRepartidorIndividualDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getRepartidorIndividualDashboardService(id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getClienteMeDashboard = async (req, res) => {
  try {
    const IDusuario = req.user.id; // Extraído por authMiddleware
    const data = await getClienteMeDashboardService(IDusuario);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};