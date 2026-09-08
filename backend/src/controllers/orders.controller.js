import {
  createOrderService,
  updateLocalItemStatusService,
  assignRepartidorService,
  getAvailableOrdersService,
  getLocalOrdersService,
  setOrderEntregadoService,
  setOrderEnCaminoService,
  getMyOrdersService,
  cancelOrderService,
  getOrderTrackingService,
  rateOrderService,
  cotizarOrdenService,
  getOrderByIdService,
  getMisPedidosAsignadosService,
  getPedidoAsignadoService,
  simularPagoExitosoService,
  searchLocalOrdersService,
  liberarPedidoRepartidorService,
  confirmarRetiroLocalService
} from '../services/orders.service.js';
import { procesarWebhookMercadoPagoService } from '../services/mercadopago.service.js';

export const createOrder = async (req, res) => {
  try {
    const IDcliente = req.user.id;
    const orderData = { ...req.body, IDcliente };

    const order = await createOrderService(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🚴 Obtener órdenes disponibles para repartidores
export const getAvailableOrders = async (req, res) => {
  try {
    const IDusuario = req.user.id; // Del Token JWT
    const orders = await getAvailableOrdersService(IDusuario);

    // 📢 Si no hay pedidos disponibles, enviamos un mensaje claro
    if (orders.length === 0) {
      return res.status(200).json({
        message: 'No hay pedidos disponibles para repartir en este momento.',
        orders: []
      });
    }

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🏪 Obtener órdenes asociadas al local autenticado
export const getLocalOrders = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const { estado } = req.query; // 👈 OBTENER EL QUERY PARAMETER

    const orders = await getLocalOrdersService(IDusuario, estado);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🏪 Actualización de estado por Local 
export const updateLocalOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { IDestado, detallesIds = [], motivo } = req.body;
    const IDusuario = req.user.id;

    if (!IDestado) {
      return res.status(400).json({ error: 'El campo IDestado es requerido' });
    }

    const result = await updateLocalItemStatusService(
      id,
      IDusuario,
      IDestado,
      detallesIds,
      motivo
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🚴 Repartidor acepta la orden
export const assignRepartidor = async (req, res) => {
  try {
    const { id } = req.params; // ID de la orden
    const IDusuario = req.user.id; // Del Token JWT

    const result = await assignRepartidorService(id, IDusuario);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🚴 Repartidor marca la orden como "En camino"
export const setOrderEnCamino = async (req, res) => {
  try {
    const { id } = req.params;
    const IDusuario = req.user.id;

    const result = await setOrderEnCaminoService(id, IDusuario);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 🚴 Repartidor marca la orden como "Entregado"
export const setOrderEntregado = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_otp } = req.body; // 👈 Recibir OTP del body
    const IDusuario = req.user.id;

    const result = await setOrderEntregadoService(id, IDusuario, codigo_otp);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const IDcliente = req.user.id;
    const orders = await getMyOrdersService(IDcliente);

    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ❌ Cancelar pedido por parte del cliente
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params; // ID de la orden
    const IDcliente = req.user.id;
    const { motivo } = req.body;

    const result = await cancelOrderService(id, IDcliente, motivo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 📍 Tracking GPS del repartidor para el cliente
export const getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const IDcliente = req.user.id;

    const trackingData = await getOrderTrackingService(id, IDcliente);
    res.json(trackingData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const rateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const IDcliente = req.user.id;
    const { puntaje } = req.body;

    const result = await rateOrderService(id, IDcliente, puntaje);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const cotizarOrden = async (req, res) => {
  try {
    const IDcliente = req.user.id;
    const cotizacion = await cotizarOrdenService({ ...req.body, IDcliente });
    res.json(cotizacion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params; // ID de la orden desde los URL Params
    const IDcliente = req.user.id; // Extraído del Token JWT por el authMiddleware

    const order = await getOrderByIdService(id, IDcliente);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMisAsignados = async (req, res) => {
  try {
    const orders = await getMisPedidosAsignadosService(req.user.id);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getPedidoAsignado = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await getPedidoAsignadoService(id, req.user.id);
    res.json(pedido);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const handleMercadoPagoWebhook = async (req, res) => {
  try {
    const result = await procesarWebhookMercadoPagoService(req.query, req.body);
    // Responder con HTTP 200/201 rápidamente para que Mercado Pago no reintente el envío
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error en Webhook Mercado Pago:', error.message);
    // Responder HTTP 200 para evitar loops si la notificación no es procesable
    return res.status(200).json({ error: error.message });
  }
};

export const simularPagoExitoso = async (req, res) => {
  try {
    const { id } = req.params; // ID de la orden
    const result = await simularPagoExitosoService(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const searchLocalOrders = async (req, res) => {
  try {
    const IDusuario = req.user.id;
    const { busqueda, fechaInicio, fechaFin, estado } = req.query;
    const orders = await searchLocalOrdersService(IDusuario, { busqueda, fechaInicio, fechaFin, estado });
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const liberarPedidoRepartidor = async (req, res) => {
  try {
    const { id } = req.params;
    const IDusuario = req.user.id;
    const { motivo } = req.body;

    const result = await liberarPedidoRepartidorService(id, IDusuario, motivo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const confirmarRetiroLocal = async (req, res) => {
  try {
    const { id } = req.params; // ID de la orden
    const { IDlocal } = req.body; // ID del local específico retirado
    const IDusuario = req.user.id;

    if (!IDlocal) {
      return res.status(400).json({ error: 'El campo IDlocal es requerido para confirmar el retiro' });
    }

    const result = await confirmarRetiroLocalService(id, IDusuario, IDlocal);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};