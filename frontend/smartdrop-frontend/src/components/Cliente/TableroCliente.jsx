// src/components/Cliente/TableroCliente.jsx
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { getClienteDashboardApi } from '../../api/tableroService';
import './CSS/Cliente.css'; // 👈 Importación correcta de los estilos unificados

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

  if (loading) {
    return (
      <div className="sd-container">
        <div className="sd-state">
          <div className="sd-spinner"></div>
          <p>Cargando tablero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-container">
      <div className="sd-dashboard-container">

        {/* Header y Filtros */}
        <header className="sd-dashboard-header">
          <div className="sd-dashboard-title">
            <h1>Tablero General - Cliente</h1>
            <p>{data?.cliente?.nombre || 'Mi Cuenta'}</p>
          </div>

          <div className="sd-dashboard-filters">
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--sd-text-secondary)' }}>
              Periodo:
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="admin-input"
              style={{ width: 'auto', minHeight: '38px' }}
            />
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="admin-input"
              style={{ width: 'auto', minHeight: '38px' }}
            />
          </div>
        </header>

        {/* Tarjetas de KPIs */}
        <section className="sd-kpi-grid-client">
          <div className="sd-kpi-card-client sd-kpi-card-client--blue">
            <span style={{ color: 'var(--sd-text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>
              Cantidad de Pedidos
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--sd-info)' }}>
              {data?.kpis?.cantidadPedidos || 0}
            </div>
          </div>

          <div className="sd-kpi-card-client sd-kpi-card-client--green">
            <span style={{ color: 'var(--sd-text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>
              Gasto Total
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--sd-success)' }}>
              {formatearMoneda(data?.kpis?.gastoTotal)}
            </div>
          </div>
        </section>

        {/* Gráficos */}
        <section className="sd-chart-grid-client">

          {/* Gráfico 1: Evolución del Gasto ($) */}
          <div className="sd-chart-card">
            <h3>Evolución del Gasto ($)</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <AreaChart data={data?.evolucionGasto || []}>
                  <defs>
                    <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--sd-success)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--sd-success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fecha" stroke="var(--sd-text-secondary)" fontSize={12} />
                  <YAxis tickFormatter={(val) => `$${val}`} stroke="var(--sd-text-secondary)" fontSize={12} />
                  <Tooltip formatter={(value) => [formatearMoneda(value), "Gasto"]} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="gasto"
                    stroke="var(--sd-success)"
                    fillOpacity={1}
                    fill="url(#colorGasto)"
                    name="Gasto ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Porcentaje por Categoría */}
          <div className="sd-chart-card">
            <h3>Cantidad de Pedidos por Categoría en %</h3>
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
        <section className="sd-table-card-client">
          <h3>Tabla de Pedidos por Cliente</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>N° Pedido</th>
                  <th>Fecha</th>
                  <th>Detalle (Local / Producto / Cantidad)</th>
                  <th style={{ textAlign: 'right' }}>Envío</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Método de Pago</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(!data?.tablaPedidos || data.tablaPedidos.length === 0) ? (
                  <tr>
                    <td colSpan="7" className="admin-table__empty">
                      No hay pedidos registrados en este periodo.
                    </td>
                  </tr>
                ) : (
                  data.tablaPedidos.map((row) => {
                    const esCancelado = row.estado?.toLowerCase() === 'cancelado';

                    return (
                      <tr
                        key={row.num_pedido}
                        style={{
                          backgroundColor: esCancelado ? 'var(--sd-tint-error)' : 'transparent'
                        }}
                      >
                        {/* ID Pedido */}
                        <td style={{ fontWeight: 700, color: esCancelado ? 'var(--sd-error)' : 'var(--sd-info)' }}>
                          #{row.num_pedido}
                        </td>

                        {/* Fecha */}
                        <td style={{ whiteSpace: 'nowrap', color: esCancelado ? 'var(--sd-text-secondary)' : 'inherit' }}>
                          {new Date(row.fecha).toLocaleDateString('es-AR')}
                        </td>

                        {/* Desglose de Locales y Productos */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(row.detalles || []).map((det, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  backgroundColor: esCancelado ? 'var(--sd-surface)' : 'var(--sd-surface-muted)',
                                  padding: '6px 10px',
                                  borderRadius: 'var(--sd-radius-sm)',
                                  border: '1px solid var(--sd-border)'
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 700, color: 'var(--sd-navy)' }}>{det.local}: </span>
                                  <span style={{ color: 'var(--sd-text-main)' }}>{det.producto}</span>
                                  <span className="admin-muted" style={{ fontSize: '0.75rem', marginLeft: '4px' }}>(x{det.cantidad})</span>
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--sd-text-main)', fontSize: '0.8125rem' }}>
                                  {formatearMoneda(det.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Costo Envío */}
                        <td style={{ textAlign: 'right', color: 'var(--sd-text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatearMoneda(row.costo_envio)}
                        </td>

                        {/* Total General de la Orden */}
                        <td style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: esCancelado ? 'var(--sd-error)' : 'var(--sd-success)',
                          textDecoration: esCancelado ? 'line-through' : 'none',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatearMoneda(row.total)}
                        </td>

                        {/* Método de Pago */}
                        <td style={{ textTransform: 'capitalize', whiteSpace: 'nowrap', color: esCancelado ? 'var(--sd-text-secondary)' : 'inherit' }}>
                          {row.metodo_pago || 'N/A'}
                        </td>

                        {/* Estado */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span className={`admin-badge ${row.estado === 'Entregado' ? 'admin-badge--success' : (esCancelado ? 'admin-badge--error' : 'admin-badge--warning')}`}>
                            {row.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};