import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { getClienteDashboardApi } from '../../api/tableroService';

const COLORES_DONA = ['#e03131', '#f59f00', '#2f9e44', '#1971c2', '#9c36b5', '#fd7e14'];

const formatearMoneda = (valor) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor || 0);

export const TableroCliente = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await getClienteDashboardApi({ fechaInicio, fechaFin });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>⏳ Cargando tablero...</div>;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>

      {/* Header y Filtros */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#212529' }}>Tablero General - Cliente</h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#6c757d', fontWeight: 600 }}>{data?.cliente?.nombre}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#495057' }}>Selecciona un periodo:</span>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
        </div>
      </header>

      {/* Tarjetas de KPIs */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '8px', borderLeft: '4px solid #1c7ed6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#6c757d', fontSize: '0.85rem', fontWeight: 600 }}>Cantidad de Pedidos</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1c7ed6', marginTop: '0.2rem' }}>
            {data?.kpis?.cantidadPedidos || 0}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '8px', borderLeft: '4px solid #2b8a3e', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#6c757d', fontSize: '0.85rem', fontWeight: 600 }}>Gasto Total</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2b8a3e', marginTop: '0.2rem' }}>
            {formatearMoneda(data?.kpis?.gastoTotal)}
          </div>
        </div>
      </section>

      {/* Gráficos */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* NUEVO Gráfico 1: Evolución del Gasto ($) */}
        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#343a40' }}>Evolución del Gasto ($)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={data?.evolucionGasto || []}>
                <defs>
                  <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2b8a3e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2b8a3e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="fecha" />
                <YAxis tickFormatter={(val) => `$${val}`} />
                <Tooltip formatter={(value) => [formatearMoneda(value), "Gasto"]} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="gasto"
                  stroke="#2b8a3e"
                  fillOpacity={1}
                  fill="url(#colorGasto)"
                  name="Gasto ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Porcentaje por Categoría */}
        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#343a40' }}>Cantidad de Pedidos por Categoría en %</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data?.pedidosPorCategoriaPorcentaje || []}
                  dataKey="porcentaje"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  label={({ porcentaje }) => `${porcentaje}%`}
                >
                  {(data?.pedidosPorCategoriaPorcentaje || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES_DONA[index % COLORES_DONA.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Tabla de Pedidos */}
      <section style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#343a40' }}>Tabla de Pedidos por Cliente</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6', color: '#495057' }}>
                <th style={{ padding: '0.6rem 0.8rem' }}>N° Pedido</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Fecha</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Detalle (Local / Producto / Cantidad)</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Envío</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Método de Pago</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tablaPedidos || []).map((row) => {
                const esCancelado = row.estado?.toLowerCase() === 'cancelado';

                return (
                  <tr
                    key={row.num_pedido}
                    style={{
                      borderBottom: '1px solid #e9ecef',
                      verticalAlign: 'top',
                      backgroundColor: esCancelado ? '#fff5f5' : 'transparent' // Fondo rojo suave si está cancelado
                    }}
                  >
                    {/* ID Pedido */}
                    <td style={{ padding: '0.75rem 0.8rem', fontWeight: 700, color: esCancelado ? '#c92a2a' : '#1c7ed6' }}>
                      #{row.num_pedido}
                    </td>

                    {/* Fecha */}
                    <td style={{ padding: '0.75rem 0.8rem', whiteSpace: 'nowrap', color: esCancelado ? '#868e96' : 'inherit' }}>
                      {new Date(row.fecha).toLocaleDateString('es-AR')}
                    </td>

                    {/* Desglose de Locales y Productos */}
                    <td style={{ padding: '0.75rem 0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {(row.detalles || []).map((det, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justify: 'space-between',
                              alignItems: 'center',
                              backgroundColor: esCancelado ? '#ffe3e3' : '#f8f9fa',
                              padding: '0.3rem 0.5rem',
                              borderRadius: '4px',
                              border: esCancelado ? '1px solid #ffc9c9' : '1px solid #e9ecef'
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, color: esCancelado ? '#a51d24' : '#343a40' }}>{det.local}: </span>
                              <span style={{ color: esCancelado ? '#495057' : '#495057' }}>{det.producto}</span>
                              <span style={{ fontSize: '0.8rem', color: '#868e96', marginLeft: '0.3rem' }}>(x{det.cantidad})</span>
                            </div>
                            <span style={{ fontWeight: 500, color: esCancelado ? '#a51d24' : '#495057', marginLeft: '0.8rem', fontSize: '0.82rem' }}>
                              {formatearMoneda(det.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Costo Envío */}
                    <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#6c757d', whiteSpace: 'nowrap' }}>
                      {formatearMoneda(row.costo_envio)}
                    </td>

                    {/* Total General de la Orden */}
                    <td style={{
                      padding: '0.75rem 0.8rem',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: esCancelado ? '#e03131' : '#2b8a3e',
                      textDecoration: esCancelado ? 'line-through' : 'none', // Opcional: línea tachada para total cancelado
                      whiteSpace: 'nowrap'
                    }}>
                      {formatearMoneda(row.total)}
                    </td>

                    {/* Método de Pago */}
                    <td style={{ padding: '0.75rem 0.8rem', textTransform: 'capitalize', whiteSpace: 'nowrap', color: esCancelado ? '#868e96' : 'inherit' }}>
                      {row.metodo_pago || 'N/A'}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backgroundColor: row.estado === 'Entregado' ? '#d3f9d8' : (esCancelado ? '#ffe3e3' : '#fff3bf'),
                        color: row.estado === 'Entregado' ? '#2b8a3e' : (esCancelado ? '#e03131' : '#f59f00')
                      }}>
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};