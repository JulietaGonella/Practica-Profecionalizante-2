// src/routes/orders.routes.js
import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRole, requireAnyRole } from '../auth/roles.middleware.js';
import {
  createOrder,
  updateLocalOrderStatus,
  assignRepartidor,
  getAvailableOrders,
  getLocalOrders,
  setOrderEnCamino,
  setOrderEntregado,
  getMyOrders,
  cancelOrder,
  getOrderTracking, // 👈 Importar
  rateOrder,
  cotizarOrden,
  getOrderById,
  getMisAsignados,
  getPedidoAsignado,
  handleMercadoPagoWebhook,
  simularPagoExitoso,
  searchLocalOrders
} from '../controllers/orders.controller.js';

const router = Router();

// 🛒 Cliente crea la orden
router.post('/', authMiddleware, requireRole('cliente'), createOrder);

// 🛒 Cliente consulta su historial de pedidos
router.get('/mis-pedidos', authMiddleware, requireRole('cliente'), getMyOrders);

// 📍 Cliente consulta el tracking GPS en vivo de una orden
router.get('/:id/tracking', authMiddleware, requireRole('cliente'), getOrderTracking);

// ❌ Cliente cancela su orden (Únicamente si estado = 1 Creado)
router.put('/:id/cancel', authMiddleware, requireRole('cliente'), cancelOrder);

// 🚴 Repartidor ve pedidos disponibles
router.get('/disponibles', authMiddleware, requireRole('repartidor'), getAvailableOrders);

router.get('/mis-asignados', authMiddleware, requireRole('repartidor'), getMisAsignados);

// 🏪 Local consulta sus pedidos
router.get('/mis-pedidos-local', authMiddleware, requireAnyRole('administrador local', 'local'), getLocalOrders);

// 🏪 Local cambia estado de sus productos
router.put('/:id/status-local', authMiddleware, requireAnyRole('administrador local', 'local'), updateLocalOrderStatus);

// 🚴 Repartidor acepta la orden
router.put('/:id/accept', authMiddleware, requireRole('repartidor'), assignRepartidor);

// 🚴 Repartidor cambia a "En camino"
router.put('/:id/en-camino', authMiddleware, requireRole('repartidor'), setOrderEnCamino);

// 🚴 Repartidor cambia a "Entregado"
router.put('/:id/entregar', authMiddleware, requireRole('repartidor'), setOrderEntregado);

// ⭐️ Cliente califica una orden entregada
router.put('/:id/calificar', authMiddleware, requireRole('cliente'), rateOrder);

router.post('/cotizar', authMiddleware, requireRole('cliente'), cotizarOrden);

router.get('/asignados/:id', authMiddleware, requireRole('repartidor'), getPedidoAsignado);

// Colocar antes de las rutas parametrizadas /:id para evitar colisiones
router.post('/webhook/mercadopago', handleMercadoPagoWebhook);
router.get('/webhook/mercadopago', handleMercadoPagoWebhook); // Mercado Pago envía reintentos mediante GET en ciertas cuentas

router.post('/:id/simular-pago', authMiddleware, simularPagoExitoso);

router.get('/buscar-local', authMiddleware, requireAnyRole('administrador local', 'local'), searchLocalOrders);

// 2. Definir la ruta GET /:id (Colocar debajo de /mis-pedidos para evitar solapamientos)
router.get('/:id', authMiddleware, requireRole('cliente'), getOrderById);

export default router;