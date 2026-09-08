// src/utils/estados.js

export const ESTADOS_ORDEN = {
  CREADO: 1,
  EN_PROGRESO: 2,
  LISTO_PARA_RETIRO: 7,
  REPARTIDOR_ASIGNADO: 4,
  RETIRADO_EN_LOCAL: 8, // 👈 Nuevo Estado
  EN_CAMINO: 5,
  ENTREGADO: 3,
  CANCELADO: 6,
};

export const SECUENCIA_ESTADOS = {
  1: { paso: 1, etiqueta: 'Creado', bg: '#fff3cd', color: '#856404' },
  2: { paso: 2, etiqueta: 'En Preparación', bg: '#cce5ff', color: '#004085' },
  7: { paso: 3, etiqueta: 'Listo para Retiro', bg: '#e2e3e5', color: '#383d41' },
  4: { paso: 4, etiqueta: 'Repartidor Asignado', bg: '#d0ebff', color: '#1864ab' },
  8: { paso: 5, etiqueta: 'Retirado en Local', bg: '#e7f5ff', color: '#0c8599' }, // 👈 Nuevo
  5: { paso: 6, etiqueta: 'En Camino', bg: '#ffe8cc', color: '#d9480f' },
  3: { paso: 7, etiqueta: 'Entregado', bg: '#d4edda', color: '#155724' },
  6: { paso: 99, etiqueta: 'Cancelado', bg: '#f8d7da', color: '#721c24' },
};

/**
 * Calcula el estado global que ve el cliente.
 * El estado general solo avanza si TODOS los productos coinciden o superan dicho estado.
 */
export const obtenerEstadoEfectivoCliente = (orden) => {
  const estadoGeneral = Number(orden?.IDestado ?? orden?.id_estado ?? 1);
  const repartidorAsignado = Boolean(orden?.repartidor_asignado || orden?.IDrepartidor);

  // Si el estado general ya es CANCELADO, ENTREGADO o EN_CAMINO, ese manda
  if ([ESTADOS_ORDEN.CANCELADO, ESTADOS_ORDEN.ENTREGADO, ESTADOS_ORDEN.EN_CAMINO].includes(estadoGeneral)) {
    return estadoGeneral;
  }

  const productos = orden?.productos || orden?.detalles || [];
  const productosActivos = productos.filter((p) => Number(p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado) !== ESTADOS_ORDEN.CANCELADO);

  if (productosActivos.length === 0) return estadoGeneral;

  const estadosItems = productosActivos.map(
    (p) => Number(p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado)
  );

  const todosListos = estadosItems.every((st) => st === ESTADOS_ORDEN.LISTO_PARA_RETIRO);

  // Regla Repartidor Asignado:
  if (repartidorAsignado || estadoGeneral === ESTADOS_ORDEN.REPARTIDOR_ASIGNADO) {
    // Si todos los productos de la orden pasan a estar 'Listos', evoluciona a LISTO_PARA_RETIRO
    if (todosListos) {
      return ESTADOS_ORDEN.LISTO_PARA_RETIRO;
    }
    // Si uno o más productos pasan a 'Listo' pero no todos, se MANTIENE en REPARTIDOR_ASIGNADO
    return ESTADOS_ORDEN.REPARTIDOR_ASIGNADO;
  }

  return Math.min(...estadosItems);
};