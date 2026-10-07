// src/services/repartidoresDashboard.service.js
import { pool } from '../config/db.js';

const FECHA_INICIO_GESTION_REPARTIDORES = '2026-10-01 14:54:00';

export const getFlotaDashboardService = async (filtros = {}) => {
  const { fechaInicio, fechaFin, repartidorFiltro, estado } = filtros;

  // 1. Cláusulas BASE (Filtra por fecha corte inicial, pedidos Entregados/Cancelados)
  const whereClausesBase = [
    "o.creado_en >= ?",  // 👈 Nuevo filtro obligatorio por fecha y hora de inicio
    "o.IDestado IN (3, 6)"
  ];
  const paramsBase = [FECHA_INICIO_GESTION_REPARTIDORES]; // 👈 Pasa la fecha límite como primer parámetro

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

const FECHA_CORTE = '2026-10-01 00:00:00';

export const getMiTableroRepartidorService = async (IDusuario, filtros = {}) => {
  const { fechaInicio, fechaFin } = filtros;

  // 1. Obtener ID del repartidor
  const [[repartidor]] = await pool.query(
    `SELECT r.id, u.username, u.nombre, u.apellido
     FROM repartidores r
     JOIN usuarios u ON r.IDusuario = u.id
     WHERE r.IDusuario = ?`,
    [IDusuario]
  );

  if (!repartidor) {
    throw new Error('El usuario no está registrado como repartidor');
  }

  const repartidorId = repartidor.id;
  const nombreCompleto = [repartidor.nombre, repartidor.apellido].filter(Boolean).join(' ') || repartidor.username;

  // 1. Cláusula WHERE: Filtrar ÚNICAMENTE por pedidos entregados (IDestado = 3)
  const whereClauses = [
    'o.IDrepartidor = ?',
    'o.IDestado = 3', // 👈 Solamente pedidos entregados
    'o.creado_en >= ?'
  ];
  const params = [repartidorId, FECHA_CORTE];

  if (fechaInicio) {
    whereClauses.push('o.creado_en >= ?');
    params.push(`${fechaInicio} 00:00:00`);
  }
  if (fechaFin) {
    whereClauses.push('o.creado_en <= ?');
    params.push(`${fechaFin} 23:59:59`);
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

  // 3. KPIs del Repartidor (Agregado SUM(o.ganancia_repartidor))
  const [[kpis]] = await pool.query(
    `SELECT 
      COALESCE(SUM(o.ganancia_repartidor), 0) AS ingresosTotales,
      COALESCE(SUM(CASE WHEN o.IDestado = 3 THEN 1 ELSE 0 END), 0) AS pedidosEntregados,
      COALESCE(SUM(o.distancia_km), 0) AS kmRecorridos
     FROM ordenes o
     ${whereSQL}`,
    params
  );

  // 4. Gráfico: Cantidad de pedidos por fecha y estado
  const [graficoRows] = await pool.query(
    `SELECT 
      DATE(o.creado_en) AS fecha,
      COUNT(o.id) AS Entregado
     FROM ordenes o
     ${whereSQL}
     GROUP BY DATE(o.creado_en)
     ORDER BY fecha ASC`,
    params
  );

  // 5. Tabla de pedidos repartidos
  const [pedidos] = await pool.query(
    `SELECT 
      o.id AS orden_id,
      o.creado_en AS fecha_clave,
      COALESCE(o.distancia_km, 0) AS distancia_km,
      COALESCE(o.ganancia_repartidor, 0) AS ganancia_repartidor,
      o.IDestado
     FROM ordenes o
     ${whereSQL}
     ORDER BY o.id DESC`,
    params
  );

  // 6. Puntos para el mapa
  const [mapaPedidos] = await pool.query(
    `SELECT 
      o.latitud_entrega AS latitud,
      o.longitud_entrega AS longitud,
      COUNT(o.id) AS cantidad_pedidos
     FROM ordenes o
     ${whereSQL}
       AND o.latitud_entrega IS NOT NULL 
       AND o.longitud_entrega IS NOT NULL
     GROUP BY o.latitud_entrega, o.longitud_entrega`,
    params
  );

  return {
    repartidor: {
      id: repartidor.id,
      username: repartidor.username,
      nombre: nombreCompleto
    },
    kpis: {
      ingresosTotales: Number(kpis?.ingresosTotales || 0),
      pedidosEntregados: Number(kpis?.pedidosEntregados || 0),
      kmRecorridos: Number(kpis?.kmRecorridos || 0)
    },
    pedidosPorFechaEstado: graficoRows.map(row => ({
      fecha: row.fecha,
      Entregado: Number(row.Entregado || 0)
    })),
    pedidos,
    mapaPedidos
  };
};