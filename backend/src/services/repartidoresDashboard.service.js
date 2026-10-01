// src/services/repartidoresDashboard.service.js
import { pool } from '../config/db.js';

export const getFlotaDashboardService = async (filtros = {}) => {
  const { fechaInicio, fechaFin, repartidorFiltro, estado } = filtros;

  // 1. Cláusulas BASE (Solo fechas, estado de pedido y restricción Entregados/Cancelados)
  const whereClausesBase = [
    "o.IDestado IN (3, 6)" // 👈 Filtra solo pedidos Entregados (3) o Cancelados (6)
  ];
  const paramsBase = [];

  if (fechaInicio) {
    whereClausesBase.push("o.creado_en >= ?");
    paramsBase.push(`${fechaInicio} 00:00:00`);
  }

  if (fechaFin) {
    whereClausesBase.push("o.creado_en <= ?");
    paramsBase.push(`${fechaFin} 23:59:59`);
  }

  if (estado && estado !== 'todos') {
    whereClausesBase.push("e.nombre = ?");
    paramsBase.push(estado);
  }

  const whereSQLBase = `WHERE ${whereClausesBase.join(' AND ')}`;

  // 2. Cláusulas COMPLETAS (Incluye el repartidor seleccionado si existe)
  const whereClauses = [...whereClausesBase];
  const params = [...paramsBase];

  if (repartidorFiltro && repartidorFiltro !== 'todos') {
    whereClauses.push("r.id = ?");
    params.push(repartidorFiltro);
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

  // 3. Catálogo de Repartidores con Pedidos Finalizados (Para poblar el selector dinámicamente)
  const [listaRepartidores] = await pool.query(`
    SELECT DISTINCT 
      r.id,
      CONCAT_WS(', ', COALESCE(NULLIF(TRIM(u.apellido), ''), u.username), u.nombre) AS nombre
    FROM repartidores r
    JOIN usuarios u ON r.IDusuario = u.id
    INNER JOIN ordenes o ON r.id = o.IDrepartidor
    LEFT JOIN estados e ON o.IDestado = e.id
    ${whereSQLBase}
    ORDER BY nombre ASC
  `, paramsBase);

  // KPIs Globales de la Flota
  const [[kpisRepartidores]] = await pool.query(`
    SELECT 
      COUNT(DISTINCT r.id) AS cantidadRepartidores,
      COALESCE(ROUND(AVG(TIMESTAMPDIFF(MINUTE, h_inicio.creado_en, h_fin.creado_en)), 2), 0) AS tiempoPromedio,
      COALESCE(ROUND((SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(o.id), 0)), 2), 0) AS porcentajeEntregados,
      COALESCE(SUM(o.distancia_km), 0) AS kmRecorridos
    FROM repartidores r
    INNER JOIN ordenes o ON r.id = o.IDrepartidor
    LEFT JOIN estados e ON o.IDestado = e.id
    LEFT JOIN hitorial_estado_orden h_inicio ON o.id = h_inicio.IDorden AND h_inicio.IDestado = 1
    LEFT JOIN hitorial_estado_orden h_fin ON o.id = h_fin.IDorden AND h_fin.IDestado = 3
    ${whereSQL}
  `, params);

  // Tabla Detallada por Repartidor
  const [tablaRepartidores] = await pool.query(`
    SELECT 
      r.id,
      CONCAT_WS(', ', COALESCE(NULLIF(TRIM(u.apellido), ''), u.username), u.nombre) AS nombre,
      COALESCE(SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END), 0) AS entregados,
      COALESCE(SUM(CASE WHEN o.IDestado = 6 THEN 1 ELSE 0 END), 0) AS cancelados,
      COALESCE(ROUND(AVG(TIMESTAMPDIFF(MINUTE, h_inicio.creado_en, h_fin.creado_en)), 2), 0) AS tiempoPromedio,
      COUNT(o.id) AS asignados
    FROM repartidores r
    JOIN usuarios u ON r.IDusuario = u.id
    INNER JOIN ordenes o ON r.id = o.IDrepartidor
    LEFT JOIN estados e ON o.IDestado = e.id
    LEFT JOIN hitorial_estado_orden h_inicio ON o.id = h_inicio.IDorden AND h_inicio.IDestado = 1
    LEFT JOIN hitorial_estado_orden h_fin ON o.id = h_fin.IDorden AND h_fin.IDestado = 3
    ${whereSQL}
    GROUP BY r.id, u.id, u.apellido, u.nombre, u.username
    ORDER BY entregados DESC
  `, params);

  // Cantidad de Pedidos Asignados por Repartidor
  const [pedidosAsignadosPorRepartidor] = await pool.query(`
    SELECT 
      COALESCE(NULLIF(TRIM(u.nombre), ''), u.username) AS nombre,
      COUNT(o.id) AS cantidad
    FROM repartidores r
    JOIN usuarios u ON r.IDusuario = u.id
    INNER JOIN ordenes o ON r.id = o.IDrepartidor
    LEFT JOIN estados e ON o.IDestado = e.id
    ${whereSQL}
    GROUP BY r.id, u.id, u.nombre, u.username
    ORDER BY cantidad DESC
  `, params);

  // Mapa de Pedidos y Ubicaciones por Repartidor
  const [mapaFlota] = await pool.query(`
    SELECT 
      r.id AS repartidor_id,
      COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellido)), ''), 
        NULLIF(u.username, ''),
        CONCAT('Repartidor #', r.id)
      ) AS nombre,
      o.latitud_entrega AS latitud,
      o.longitud_entrega AS longitud,
      COUNT(o.id) AS cantidad_pedidos
    FROM ordenes o
    JOIN repartidores r ON o.IDrepartidor = r.id
    JOIN usuarios u ON r.IDusuario = u.id
    LEFT JOIN estados e ON o.IDestado = e.id
    ${whereSQL}
    AND o.latitud_entrega IS NOT NULL 
    AND o.longitud_entrega IS NOT NULL
    GROUP BY r.id, u.id, u.nombre, u.apellido, u.username, o.latitud_entrega, o.longitud_entrega
  `, params);

  return {
    kpisRepartidores: kpisRepartidores || { cantidadRepartidores: 0, tiempoPromedio: 0, porcentajeEntregados: 0, kmRecorridos: 0 },
    tablaRepartidores,
    pedidosAsignadosPorRepartidor,
    mapaFlota,
    listaRepartidores
  };
};

// Tablero Vista Individual de Repartidor
export const getRepartidorIndividualDashboardService = async (repartidorId) => {
  const [[driverInfo]] = await pool.query(`
    SELECT 
      r.id,
      u.username,
      COUNT(o.id) AS pedidos_asignados,
      SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END) AS pedidos_entregados,
      COALESCE(SUM(o.distancia_km), 0) AS total_km_recorridos
    FROM repartidores r
    JOIN usuarios u ON r.IDusuario = u.id
    LEFT JOIN ordenes o ON r.id = o.IDrepartidor
    WHERE r.id = ?
    GROUP BY r.id, u.username
  `, [repartidorId]);

  if (!driverInfo) throw new Error('Repartidor no encontrado');

  const [historialPedidos] = await pool.query(`
    SELECT 
      o.id AS orden_id,
      o.total,
      (o.costo_envio * 0.85) AS ganancia_estimada_repartidor,
      o.distancia_km,
      o.puntaje_cliente,
      e.nombre AS estado,
      o.tiempo_estimado_min
    FROM ordenes o
    JOIN estados e ON o.IDestado = e.id
    WHERE o.IDrepartidor = ?
    ORDER BY o.id DESC
  `, [repartidorId]);

  return {
    driver: driverInfo,
    historial_pedidos: historialPedidos
  };
};