import { pool } from '../config/db.js';

export const getClienteMeDashboardService = async (IDusuario) => {
  // 1. Datos Generales y KPIs de Consumo
  const [[kpis]] = await pool.query(`
    SELECT 
      COUNT(o.id) AS total_pedidos,
      COALESCE(SUM(CASE WHEN o.IDestado = 3 THEN o.total ELSE 0 END), 0) AS gasto_total
    FROM ordenes o
    WHERE o.IDcliente = ?
  `, [IDusuario]);

  // 2. Gráfico Circular de Preferencias por Categoría
  const [preferenciasCategorias] = await pool.query(`
    SELECT 
      COALESCE(cp.nombre, 'Varios') AS categoria,
      ROUND((COUNT(do.id) * 100.0 / (
        SELECT COUNT(do2.id) 
        FROM detalle_orden do2 
        JOIN ordenes o2 ON do2.IDorden = o2.id 
        WHERE o2.IDcliente = ?
      )), 1) AS porcentaje
    FROM detalle_orden do
    JOIN productos p ON do.IDproducto = p.id
    LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
    JOIN ordenes o ON do.IDorden = o.id
    WHERE o.IDcliente = ?
    GROUP BY cp.id, cp.nombre
  `, [IDusuario, IDusuario]);

  // 3. Tabla con el Historial de Pedidos y Estado
  const [pedidos] = await pool.query(`
    SELECT 
      o.id AS orden_id,
      o.total,
      o.puntaje_cliente,
      e.nombre AS estado,
      mp.nombre AS metodo_pago
    FROM ordenes o
    JOIN estados e ON o.IDestado = e.id
    LEFT JOIN metodos_pago mp ON o.IDmetodo_pago = mp.id
    WHERE o.IDcliente = ?
    ORDER BY o.id DESC
  `, [IDusuario]);

  return {
    kpis,
    preferencias_categorias: preferenciasCategorias,
    historial_pedidos: pedidos
  };
};