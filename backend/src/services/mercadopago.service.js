import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { pool } from '../config/db.js';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

export const crearPreferenciaMercadoPago = async ({
  IDorden,
  totalFinal,
  productos,
  costoEnvio
}) => {
  const preference = new Preference(client);

  // Asegurar formato limpio sin saltos de línea ni espacios
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').trim();

  const items = productos.map((item) => ({
    id: String(item.IDproducto),
    title: String(item.nombre || `Producto ID #${item.IDproducto}`),
    unit_price: Number(item.precioUnitarioFinal),
    quantity: Number(item.cantidad),
    currency_id: 'ARS'
  }));

  if (costoEnvio > 0) {
    items.push({
      id: 'ENVIO',
      title: 'Costo de Envío',
      unit_price: Number(costoEnvio),
      quantity: 1,
      currency_id: 'ARS'
    });
  }

  // Si estás probando en entorno local sin Ngrok ni un dominio público HTTPS,
  // omite 'auto_return' para evitar la validación estricta de Mercado Pago.
  const payload = {
    items,
    external_reference: String(IDorden),
    back_urls: {
      success: `${frontendUrl}/cliente/seguimiento/${IDorden}`,
      failure: `${frontendUrl}/cliente/seguimiento/${IDorden}`,
      pending: `${frontendUrl}/cliente/seguimiento/${IDorden}`
    }
  };

  // Solo agregar notification_url si es HTTPS o si no usas localhost en webhooks
  if (backendUrl.startsWith('https://')) {
    payload.notification_url = `${backendUrl}/orders/webhook/mercadopago`;
  }

  // Si tienes un dominio en producción o estás usando ngrok, puedes activar auto_return:
  if (frontendUrl.startsWith('https://')) {
    payload.auto_return = 'approved';
  }

  const result = await preference.create({ body: payload });

  return {
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
    preferenceId: result.id
  };
};

export const procesarWebhookMercadoPagoService = async (queryData, bodyData) => {
  // Mercado Pago envía el tipo de notificación por Query Params o Body
  const topic = queryData.topic || queryData.type || bodyData.type;
  const paymentId = queryData['data.id'] || queryData.id || bodyData?.data?.id;

  if (topic !== 'payment' || !paymentId) {
    return { received: true, status: 'ignored' };
  }

  // 1. Obtener los detalles del pago directamente desde la API oficial de Mercado Pago
  const paymentClient = new Payment(client);
  const payment = await paymentClient.get({ id: paymentId });

  const IDorden = payment.external_reference;
  const mpStatus = payment.status; // 'approved', 'rejected', 'in_process', etc.

  if (!IDorden) {
    return { received: true, status: 'missing_external_reference' };
  }

  // 2. Mapear estado de Mercado Pago a IDs de estados_pago (1: pendiente, 2: aprobado, 3: rechazado)
  let estadoPagoId = 1;
  if (mpStatus === 'approved') estadoPagoId = 2;
  else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus)) estadoPagoId = 3;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 3. Actualizar IDestado_pago en la orden
    await conn.query(
      `UPDATE ordenes SET IDestado_pago = ? WHERE id = ?`,
      [estadoPagoId, IDorden]
    );

    // 4. Si el pago fue aprobado y la orden estaba en estado 1 (Creado), avanzar a estado 2 (En progreso)
    if (estadoPagoId === 2) {
      const [[orden]] = await conn.query(
        `SELECT IDestado FROM ordenes WHERE id = ? FOR UPDATE`,
        [IDorden]
      );

      if (orden && orden.IDestado === 1) {
        await conn.query(
          `UPDATE ordenes SET IDestado = 2 WHERE id = ?`,
          [IDorden]
        );

        await conn.query(
          `UPDATE detalle_orden SET IDestado = 2 WHERE IDorden = ?`,
          [IDorden]
        );

        await conn.query(
          `INSERT INTO hitorial_estado_orden (IDorden, IDestado) VALUES (?, 2)`,
          [IDorden]
        );
      }
    }

    await conn.commit();
    return { received: true, orderId: IDorden, status: mpStatus };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};