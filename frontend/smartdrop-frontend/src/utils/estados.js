// src/utils/estados.js

export const ESTADOS_ORDEN = {
  CREADO: 1,
  EN_PROGRESO: 2,
  LISTO_PARA_RETIRO: 7,
  REPARTIDOR_ASIGNADO: 4,
  EN_CAMINO: 5,
  ENTREGADO: 3,
  CANCELADO: 6,
};

export const SECUENCIA_ESTADOS = {
  1: { paso: 1, etiqueta: 'Creado', bg: '#fff3cd', color: '#856404' },
  2: { paso: 2, etiqueta: 'En Preparación', bg: '#cce5ff', color: '#004085' },
  7: { paso: 3, etiqueta: 'Listo para Retiro', bg: '#e2e3e5', color: '#383d41' },
  4: { paso: 4, etiqueta: 'Repartidor Asignado', bg: '#d0ebff', color: '#1864ab' },
  5: { paso: 5, etiqueta: 'En Camino', bg: '#ffe8cc', color: '#d9480f' },
  3: { paso: 6, etiqueta: 'Entregado', bg: '#d4edda', color: '#155724' },
  6: { paso: 99, etiqueta: 'Cancelado', bg: '#f8d7da', color: '#721c24' },
};

/**
 * Calcula el estado global que ve el cliente.
 * El estado general solo avanza si TODOS los productos coinciden o superan dicho estado.
 */
export const obtenerEstadoEfectivoCliente = (orden) => {
  const estadoGeneral = Number(orden?.IDestado ?? orden?.id_estado ?? 1);

  // El estado general de la orden debe primar sobre los detalles.
  // Si la orden ya tiene un estado real, ese es el que se muestra arriba.
  if (
    [
      ESTADOS_ORDEN.CREADO,
      ESTADOS_ORDEN.EN_PROGRESO,
      ESTADOS_ORDEN.LISTO_PARA_RETIRO,
      ESTADOS_ORDEN.REPARTIDOR_ASIGNADO,
      ESTADOS_ORDEN.EN_CAMINO,
      ESTADOS_ORDEN.ENTREGADO,
      ESTADOS_ORDEN.CANCELADO
    ].includes(estadoGeneral)
  ) {
    return estadoGeneral;
  }

  // Fallback solo por si la orden no tuviera estado general.
  const productos = orden?.productos || orden?.detalles || [];
  if (!productos || productos.length === 0) return estadoGeneral;

  const estadosItems = productos.map(
    (p) => Number(p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado ?? estadoGeneral)
  );

  if (estadosItems.length === 0) return estadoGeneral;

  return Math.min(...estadosItems);
};