import { pool } from '../config/db.js';

// Tablero General de la Flota
export const getFlotaDashboardService = async () => {
  // KPIs Globales de Repartidores
  const [[kpis]] = await pool.query(`
    SELECT 
      COUNT(DISTINCT r.id) AS total_repartidores,
      COALESCE(SUM(o.distancia_km), 0) AS total_km_recorridos,
      ROUND(AVG(TIMESTAMPDIFF(MINUTE, h_inicio.creado_en, h_fin.creado_en)), 2) AS tiempo_promedio_entrega_min,
      ROUND((SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id)), 2) AS porcentaje_entregados
    FROM repartidores r
    LEFT JOIN ordenes o ON r.id = o.IDrepartidor
    LEFT JOIN hitorial_estado_orden h_inicio ON o.id = h_inicio.IDorden AND h_inicio.IDestado = 1
    LEFT JOIN hitorial_estado_orden h_fin ON o.id = h_fin.IDorden AND h_fin.IDestado = 3
  `);

  // Repartidores con cantidad de pedidos asignados (para el gráfico de barras)
  const [barrasRepartidores] = await pool.query(`
    SELECT 
      u.username AS repartidor,
      COUNT(o.id) AS pedidos_asignados
    FROM repartidores r
    JOIN usuarios u ON r.IDusuario = u.id
    LEFT JOIN ordenes o ON r.id = o.IDrepartidor
    GROUP BY r.id, u.username
    ORDER BY pedidos_asignados DESC
  `);

  // Ubicación GPS actual de repartidores activos (Mapa interactivo)
  const [mapaFlota] = await pool.query(`
    SELECT 
      r.id AS repartidor_id,
      u.username,
      r.latitud,
      r.longitud,
      r.disponible,
      r.ultima_ubicacion
    FROM repartidores r
    JOIN usuarios u ON r.IDusuario = u.id
    WHERE r.latitud IS NOT NULL AND r.longitud IS NOT NULL
  `);

  return {
    kpis,
    pedidos_por_repartidor: barrasRepartidores,
    mapa_cobertura_flota: mapaFlota
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

  // Historial detallado con cálculo de ganancias e índice de puntuación
  const [historialPedidos] = await pool.query(`
    SELECT 
      o.id AS orden_id,
      o.total,
      (o.costo_envio * 0.85) AS ganancia_estimada_repartidor, -- 85% para el driver
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