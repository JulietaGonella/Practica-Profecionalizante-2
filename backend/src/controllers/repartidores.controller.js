import { 
  simularRecorridoOrdenService, 
  createRepartidorService,
  getTiposVehiculoService,
  addVehiculoRepartidorService,
  validarRepartidorService, // 👈 Asegurarnos de importar la función del servicio
  updateUbicacionService,
  getDisponibilidadService,
  updateDisponibilidadService,
  getMisVehiculosService,
  solicitarVehiculoService,
  seleccionarVehiculoActivoService,
  getVehiculosPendientesService,
  revisarVehiculoService,
  getRepartidoresAdminService,
  getMiPerfilRepartidorService,
  getGananciasHoyService,
  actualizarDocumentosVehiculoService
} from '../services/repartidores.service.js';

export const createRepartidor = async (req, res) => {
  try {
    const repartidor = await createRepartidorService(req.body);
    res.status(201).json(repartidor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getTiposVehiculo = async (req, res) => {
  try {
    const tipos = await getTiposVehiculoService();
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addVehiculo = async (req, res) => {
  try {
    const { id } = req.params; // IDrepartidor
    const result = await addVehiculoRepartidorService(id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const simularRecorrido = async (req, res) => {
  try {
    const { id } = req.params; // IDrepartidor
    const { IDorden } = req.body;

    if (!IDorden) {
      return res.status(400).json({ error: 'IDorden es requerido para simular el recorrido' });
    }

    const resultado = await simularRecorridoOrdenService(IDorden, id);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const validarRepartidor = async (req, res) => {
  try {
    const { id } = req.params;
    let { validado } = req.body

    // Si viene como string "true" o "false", convertirlo a booleano real
    if (typeof validado === 'string') {
      if (validado.toLowerCase() === 'true') validado = true;
      if (validado.toLowerCase() === 'false') validado = false;
    }

    if (validado === undefined) {
      return res.status(400).json({ error: 'El campo "validado" es obligatorio (true/false o 1/0)' });
    }

    const result = await validarRepartidorService(id, validado);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateUbicacion = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const { latitud, longitud } = req.body;

    const result = await updateUbicacionService(IDusuario, latitud, longitud);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getDisponibilidad = async (req, res) => {
  try {
    res.json(await getDisponibilidadService(req.user.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateDisponibilidad = async (req, res) => {
  try {
    const { disponible } = req.body;
    if (disponible === undefined) {
      return res.status(400).json({ error: 'El campo disponible es obligatorio.' });
    }

    res.json(await updateDisponibilidadService(req.user.id, disponible));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMisVehiculos = async (req, res) => {
  try {
    res.json(await getMisVehiculosService(req.user.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const solicitarVehiculo = async (req, res) => {
  try {
    res.status(201).json(
      await solicitarVehiculoService(req.user.id, req.body, req.files || {})
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const seleccionarVehiculoActivo = async (req, res) => {
  try {
    const IDvehiculo = req.body.IDvehiculo ?? req.params.id;

    if (!IDvehiculo) {
      return res.status(400).json({ error: 'El campo IDvehiculo es obligatorio.' });
    }

    res.json(await seleccionarVehiculoActivoService(req.user.id, IDvehiculo));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getVehiculosPendientes = async (req, res) => {
  try {
    res.json(await getVehiculosPendientesService());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const revisarVehiculo = async (req, res) => {
  try {
    const { estado, motivo_rechazo } = req.body;
    res.json(await revisarVehiculoService(req.params.id, estado, motivo_rechazo));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getRepartidoresAdmin = async (req, res) => {
  try {
    const repartidores = await getRepartidoresAdminService();
    res.json(repartidores);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMiPerfilRepartidor = async (req, res) => {
  try {
    const perfil = await getMiPerfilRepartidorService(req.user.id);
    res.json(perfil);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getGananciasHoy = async (req, res) => {
  try {
    const IDusuario = req.user.id; // Extraído del token JWT por authMiddleware
    const ganancias = await getGananciasHoyService(IDusuario);
    
    res.json(ganancias);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const actualizarDocumentosVehiculo = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const { id } = req.params; // ID del vehículo
    const result = await actualizarDocumentosVehiculoService(IDusuario, id, req.files);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};