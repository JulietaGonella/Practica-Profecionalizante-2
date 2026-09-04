// src/config/commissions.js
export const COMMISSIONS = {
  // Comision al local (ej: 10%)
  PLATFORM_FEE_PERCENTAGE: Number(process.env.PLATFORM_FEE_PERCENTAGE) || 10,
  
  // Retención del costo de envío (ej: 15% para la app, 85% para el repartidor)
  DELIVERY_MARGIN_PERCENTAGE: Number(process.env.DELIVERY_MARGIN_PERCENTAGE) || 15,
};