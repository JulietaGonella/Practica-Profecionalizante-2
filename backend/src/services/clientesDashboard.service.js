import { pool } from '../config/db.js';

const FECHA_CORTE = '2026-10-01 00:00:00';

export const getClienteMeDashboardService = async (IDusuario, filtros = {}) => {
  const { fechaInicio, fechaFin } = filtros;

  // 1. Obtener nombre del cliente
  const [[cliente]] = await pool.query(
    `SELECT u.nombre, u.apellido, u.username
     FROM usuarios u
     WHERE u.id = ?`,
    [IDusuario]
  );

  const nombreCompleto = [cliente?.nombre, cliente?.apellido].filter(Boolean).join(', ') || cliente?.username || 'Cliente';

  // 2. Filtros de Fecha con Fecha de Corte
  const whereClauses = ['o.IDcliente = ?', 'o.creado_en >= ?'];
  const params = [IDusuario, FECHA_CORTE];

  if (fechaInicio) {
    whereClauses.push('o.creado_en >= ?');
    params.push(`${fechaInicio} 00:00:00`);
  }
  if (fechaFin) {
    whereClauses.push('o.creado_en <= ?');
    params.push(`${fechaFin} 23:59:59`);
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

  // 3. KPIs del Cliente
  const [[kpis]] = await pool.query(
    `SELECT 
      COUNT(DISTINCT o.id) AS cantidadPedidos,
      COALESCE(SUM(CASE WHEN o.IDestado = 3 THEN o.total ELSE 0 END), 0) AS gastoTotal
     FROM ordenes o
     ${whereSQL}`,
    params
  );

  // 4. Cantidad de Pedidos por Fecha y Categoría (Gráfico de Líneas/Puntos)
  const [evolucionGasto] = await pool.query(
    `SELECT 
    DATE_FORMAT(o.creado_en, '%Y-%m-%d') AS fecha,
    COALESCE(SUM(o.total), 0) AS gasto
   FROM ordenes o
   ${whereSQL} AND o.IDestado = 3
   GROUP BY DATE_FORMAT(o.creado_en, '%Y-%m-%d')
   ORDER BY fecha ASC`,
    params
  );

  // 5. Porcentaje por Categoría (Gráfico Circular / Dona)
  const [pedidosPorCategoriaPorcentaje] = await pool.query(
    `SELECT 
      COALESCE(cp.nombre, 'Sin Categoría') AS categoria,
      COUNT(do.id) AS total_items
     FROM ordenes o
     JOIN detalle_orden do ON o.id = do.IDorden
     JOIN productos p ON do.IDproducto = p.id
     LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
     ${whereSQL}
     GROUP BY cp.id, cp.nombre`,
    params
  );

  const totalItems = pedidosPorCategoriaPorcentaje.reduce((acc, curr) => acc + Number(curr.total_items), 0);
  const categoriasFormateadas = pedidosPorCategoriaPorcentaje.map(item => ({
    categoria: item.categoria,
    porcentaje: totalItems > 0 ? Number(((item.total_items / totalItems) * 100).toFixed(1)) : 0
  }));

  // 6. Tabla de Pedidos por Cliente (Unificada por Orden)
  const [tablaPedidos] = await pool.query(
    `SELECT 
    o.id AS num_pedido,
    o.creado_en AS fecha,
    o.costo_envio,
    o.total,
    mp.nombre AS metodo_pago,
    e.nombre AS estado,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'local', l.nombre,
        'producto', p.nombre,
        'cantidad', do.cantidad,
        'precio_unitario', do.precio_unitario,
        'subtotal', (do.cantidad * do.precio_unitario)
      )
    ) AS detalles
   FROM ordenes o
   JOIN detalle_orden do ON o.id = do.IDorden
   JOIN productos p ON do.IDproducto = p.id
   JOIN locales l ON do.IDlocal = l.id
   JOIN estados e ON o.IDestado = e.id
   LEFT JOIN metodos_pago mp ON o.IDmetodo_pago = mp.id
   ${whereSQL}
   GROUP BY o.id, o.creado_en, o.costo_envio, o.total, mp.nombre, e.nombre
   ORDER BY o.id DESC`,
    params
  );

  // Mapeamos para asegurarnos de que 'detalles' sea un array (en caso de que MySQL devuelva string JSON)
  const tablaFormateada = tablaPedidos.map(pedido => ({
    ...pedido,
    detalles: typeof pedido.detalles === 'string' ? JSON.parse(pedido.detalles) : pedido.detalles
  }));

  return {
    cliente: { nombre: nombreCompleto },
    kpis: {
      cantidadPedidos: Number(kpis?.cantidadPedidos || 0),
      gastoTotal: Number(kpis?.gastoTotal || 0)
    },
    evolucionGasto,
    pedidosPorCategoriaPorcentaje: categoriasFormateadas,
    tablaPedidos: tablaFormateada
  };
};