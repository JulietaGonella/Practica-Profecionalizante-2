import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { getAdminDashboardApi, getFlotaDashboardApi } from "../../api/tableroService.js";
import { MapaRepartidores } from './MapaRepartidores';
import { Icon, Badge } from './AdminUI';
import './CSS/Administrador.css';

// Colores de gráficos alineados a la paleta SmartDrop
const COLORES_PAGO = ['#17243A', '#F47A16', '#245FC7', '#16804A'];
const COLORES_ESTADO = { Entregado: '#16804A', Cancelado: '#B42332' };

// Estilos compartidos de los gráficos (solo visual)
const TICK = { fill: '#667085', fontSize: 12 };
const EJE = { stroke: '#E6E9ED' };
const TOOLTIP_ESTILO = {
    borderRadius: 10,
    border: '1px solid #E6E9ED',
    boxShadow: '0 6px 16px rgba(23, 36, 58, 0.08)',
    fontSize: 13
};

const GraficoVacio = ({ children }) => (
    <div className="admin-chart-empty">
        <Icon name="chart" size={24} />
        {children}
    </div>
);

export const TableroAdministrador = () => {
    const [subVista, setSubVista] = useState('general');
    const [error, setError] = useState(null);

    // Estados para el rango de fechas
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const [categoria, setCategoria] = useState('todas');
    const [estadoPedido, setEstadoPedido] = useState('todos');
    const [tipoPago, setTipoPago] = useState('todos');
    const [repartidorFiltro, setRepartidorFiltro] = useState('todos');

    const [listaCategorias, setListaCategorias] = useState([]);
    const [listaRepartidores, setListaRepartidores] = useState([]);

    const [kpisGeneral, setKpisGeneral] = useState({ totalPedidos: 0, entregados: 0, cancelados: 0, ingresosPlataforma: 0 });
    const [pedidosPorCategoria, setPedidosPorCategoria] = useState([]);
    const [pedidosPorFechaEstado, setPedidosPorFechaEstado] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);

    const [kpisRepartidores, setKpisRepartidores] = useState({ cantidadRepartidores: 0, tiempoPromedio: 0, porcentajeEntregados: 0, kmRecorridos: 0 });
    const [tablaRepartidores, setTablaRepartidores] = useState([]);
    const [pedidosAsignadosPorRepartidor, setPedidosAsignadosPorRepartidor] = useState([]);
    const [mapaFlota, setMapaFlota] = useState([]);

    useEffect(() => {
        let activo = true;
        let temporizador;

        const cargarDatos = async () => {
            try {
                if (subVista === 'general') {
                    const params = {
                        fechaInicio,
                        fechaFin,
                        categoria,
                        estado: estadoPedido,
                        tipoPago
                    };
                    const data = await getAdminDashboardApi(params);
                    if (!activo) return;
                    setError(null);
                    setKpisGeneral(data.kpisGeneral || { totalPedidos: 0, entregados: 0, cancelados: 0, ingresosPlataforma: 0 });
                    setPedidosPorCategoria(data.pedidosPorCategoria || []);
                    setPedidosPorFechaEstado(data.pedidosPorFechaEstado || []);
                    setMetodosPago(data.metodosPago || []);
                    if (data.categorias) {
                        setListaCategorias(data.categorias);
                    }
                } else if (subVista === 'repartidores') {
                    const params = {
                        fechaInicio,
                        fechaFin,
                        repartidorFiltro,
                        estado: estadoPedido
                    };
                    const data = await getFlotaDashboardApi(params);
                    if (!activo) return;
                    setError(null);
                    setKpisRepartidores(data.kpisRepartidores || { cantidadRepartidores: 0, tiempoPromedio: 0, porcentajeEntregados: 0, kmRecorridos: 0 });
                    setTablaRepartidores(data.tablaRepartidores || []);
                    setPedidosAsignadosPorRepartidor(data.pedidosAsignadosPorRepartidor || []);
                    setMapaFlota(data.mapaFlota || []);
                    if (data.listaRepartidores) {
                        setListaRepartidores(data.listaRepartidores);
                    }
                }
            } catch (err) {
                if (activo) {
                    console.error('Error al cargar datos del tablero:', err);
                    setError('No se pudieron obtener las métricas del servidor.');
                }
            } finally {
                if (activo) {
                    temporizador = setTimeout(cargarDatos, 30000);
                }
            }
        };

        cargarDatos();
        return () => {
            activo = false;
            clearTimeout(temporizador);
        };
    }, [subVista, fechaInicio, fechaFin, categoria, estadoPedido, tipoPago, repartidorFiltro]);

    return (
        <div className="admin-tablero">
            <div className="admin-tablero__inner admin-scope">

                {/* Pestañas de navegación */}
                <div className="admin-subtabs">
                    <button
                        type="button"
                        onClick={() => setSubVista('general')}
                        className={subVista === 'general' ? 'active' : ''}
                        aria-pressed={subVista === 'general'}
                    >
                        <Icon name="chart" />
                        Tablero general 
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubVista('repartidores')}
                        className={subVista === 'repartidores' ? 'active' : ''}
                        aria-pressed={subVista === 'repartidores'}
                    >
                        <Icon name="bike" />
                        Gestión de repartidores
                    </button>
                </div>

                {error && (
                    <div className="admin-inline-note admin-inline-note--error" role="alert" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Icon name="alert" size={16} />
                        {error}
                    </div>
                )}

                {/* VISTA 1: TABLERO GENERAL */}
                {subVista === 'general' && (
                    <>
                        <h2 className="admin-section-title" style={{ marginBottom: 0 }}>
                            <span className="admin-section-title__icon"><Icon name="chart" size={20} /></span>
                            Tablero General - Administrador
                        </h2>

                        {/* Filtros */}
                        <div className="admin-filters">
                            <label className="admin-field">
                                <span>Desde</span>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="admin-input"
                                />
                            </label>

                            <label className="admin-field">
                                <span>Hasta</span>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="admin-input"
                                />
                            </label>

                            <label className="admin-field">
                                <span>Categoría</span>
                                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="admin-select">
                                    <option value="todas">Todas las categorías</option>
                                    {listaCategorias.map((cat) => (
                                        <option key={cat.id || cat.nombre} value={cat.nombre}>
                                            {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="admin-field">
                                <span>Estados de pedido</span>
                                <select value={estadoPedido} onChange={(e) => setEstadoPedido(e.target.value)} className="admin-select">
                                    <option value="todos">Todos los estados</option>
                                    <option value="Entregado">Entregado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </label>

                            <label className="admin-field">
                                <span>Tipo de pago</span>
                                <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} className="admin-select">
                                    <option value="todos">Todos los métodos</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="mercadopago">Mercado Pago</option>
                                    <option value="tarjeta_credito">Tarjeta</option>
                                </select>
                            </label>
                        </div>

                        <p className="admin-field-hint" style={{ marginTop: '-8px', alignItems: 'flex-start' }}>
                            <Icon name="info" size={14} />
                            <span>
                                Los indicadores consideran pedidos creados desde el 01/10/2026 a las 14:54, cuando comenzó el registro de comisiones por producto.
                            </span>
                        </p>

                        {/* Tarjetas de KPIs */}
                        <div className="admin-kpi-grid">
                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon"><Icon name="package" size={18} /></span>
                                    <span className="admin-kpi__label">Total de pedidos</span>
                                </div>
                                <div className="admin-kpi__value">{kpisGeneral.totalPedidos}</div>
                            </div>

                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon admin-kpi__icon--info"><Icon name="checkCircle" size={18} /></span>
                                    <span className="admin-kpi__label">Pedidos entregados vs cancelados</span>
                                </div>
                                <div className="admin-kpi__rows">
                                    <div className="admin-kpi__row">
                                        <Badge tone="success" icon="checkCircle">Entregado</Badge>
                                        <strong className="admin-text-success">{kpisGeneral.entregados}</strong>
                                    </div>
                                    <div className="admin-kpi__row">
                                        <Badge tone="error" icon="xCircle">Cancelado</Badge>
                                        <strong className="admin-text-error">{kpisGeneral.cancelados}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon admin-kpi__icon--orange"><Icon name="dollar" size={18} /></span>
                                    <span className="admin-kpi__label">
                                        {categoria === 'todas' ? 'Ingresos netos de la plataforma' : 'Comisiones de productos de la categoría'}
                                    </span>
                                </div>
                                <div className="admin-kpi__value admin-kpi__value--success" style={{ fontSize: '1.75rem' }}>
                                    $ {Number(kpisGeneral.ingresosPlataforma).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* Gráficos */}
                        <div className="admin-chart-grid">
                            <div className="admin-panel-card">
                                <h3>Cantidad de pedidos por categoría</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    {pedidosPorCategoria && pedidosPorCategoria.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={pedidosPorCategoria} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9ED" />
                                                <XAxis type="number" tick={TICK} axisLine={EJE} tickLine={false} />
                                                <YAxis dataKey="categoria" type="category" width={110} tick={TICK} axisLine={EJE} tickLine={false} />
                                                <Tooltip contentStyle={TOOLTIP_ESTILO} cursor={{ fill: 'rgba(23, 36, 58, 0.04)' }} />
                                                <Bar dataKey="cantidad" fill="#17243A" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <GraficoVacio>No hay datos de pedidos por categoría para los filtros seleccionados.</GraficoVacio>
                                    )}
                                </div>
                            </div>

                            <div className="admin-panel-card">
                                <h3>Cantidad de pedidos por fecha y estado</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={pedidosPorFechaEstado}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E6E9ED" />
                                            <XAxis dataKey="fecha" tick={TICK} axisLine={EJE} tickLine={false} />
                                            <YAxis tick={TICK} axisLine={EJE} tickLine={false} />
                                            <Tooltip contentStyle={TOOLTIP_ESTILO} cursor={{ fill: 'rgba(23, 36, 58, 0.04)' }} />
                                            <Legend wrapperStyle={{ fontSize: 13 }} />
                                            <Bar dataKey="Entregado" fill={COLORES_ESTADO.Entregado} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Cancelado" fill={COLORES_ESTADO.Cancelado} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="admin-panel-card">
                                <h3>Porcentaje de acuerdo a los métodos de pago</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    {metodosPago && metodosPago.length > 0 && metodosPago.some(m => Number(m.value) > 0) ? (
                                        <ResponsiveContainer>
                                            <PieChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                                                <Pie
                                                    data={metodosPago.map(m => ({ ...m, value: Number(m.value) }))}
                                                    cx="50%"
                                                    cy="45%"
                                                    outerRadius={75}
                                                    dataKey="value"
                                                    stroke="#FFFFFF"
                                                    label={({ value }) => `${value}%`}
                                                >
                                                    {metodosPago.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORES_PAGO[index % COLORES_PAGO.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={TOOLTIP_ESTILO} formatter={(val) => `${val}%`} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 13 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <GraficoVacio>No hay datos de métodos de pago para los filtros seleccionados.</GraficoVacio>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* VISTA 2: GESTIÓN DE REPARTIDORES */}
                {subVista === 'repartidores' && (
                    <>
                        <h2 className="admin-section-title" style={{ marginBottom: 0 }}>
                            <span className="admin-section-title__icon"><Icon name="bike" size={20} /></span>
                            Tablero General - Gestión de Repartidores
                        </h2>

                        {/* Filtros */}
                        <div className="admin-filters">
                            <label className="admin-field">
                                <span>Desde</span>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="admin-input"
                                />
                            </label>

                            <label className="admin-field">
                                <span>Hasta</span>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="admin-input"
                                />
                            </label>

                            <label className="admin-field">
                                <span>Estado de pedido</span>
                                <select value={estadoPedido} onChange={(e) => setEstadoPedido(e.target.value)} className="admin-select">
                                    <option value="todos">Todos los estados</option>
                                    <option value="Entregado">Entregado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </label>

                            <label className="admin-field">
                                <span>Repartidores con pedidos</span>
                                <select value={repartidorFiltro} onChange={(e) => setRepartidorFiltro(e.target.value)} className="admin-select">
                                    <option value="todos">Todos los repartidores con pedidos</option>
                                    {listaRepartidores.map((r) => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {/* Tarjetas de KPIs repartidores */}
                        <div className="admin-kpi-grid">
                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon"><Icon name="users" size={18} /></span>
                                    <span className="admin-kpi__label">Cantidad de repartidores con pedidos</span>
                                </div>
                                <div className="admin-kpi__value">{kpisRepartidores.cantidadRepartidores}</div>
                            </div>

                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon admin-kpi__icon--info"><Icon name="timer" size={18} /></span>
                                    <span className="admin-kpi__label">Tiempo promedio de entrega</span>
                                </div>
                                <div className="admin-kpi__value">
                                    {Math.round(Number(kpisRepartidores.tiempoPromedio) || 0)} min
                                </div>
                            </div>

                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon admin-kpi__icon--success"><Icon name="percent" size={18} /></span>
                                    <span className="admin-kpi__label">Porcentaje de pedidos entregados</span>
                                </div>
                                <div className="admin-kpi__value admin-kpi__value--success">{kpisRepartidores.porcentajeEntregados}%</div>
                            </div>

                            <div className="admin-kpi">
                                <div className="admin-kpi__top">
                                    <span className="admin-kpi__icon admin-kpi__icon--orange"><Icon name="navigation" size={18} /></span>
                                    <span className="admin-kpi__label">Total de km recorridos</span>
                                </div>
                                <div className="admin-kpi__value">{kpisRepartidores.kmRecorridos} km</div>
                            </div>
                        </div>

                        {/* Tabla y gráficos */}
                        <div className="admin-chart-grid">
                            <div className="admin-panel-card admin-panel-card--flush">
                                <h3>Tabla de pedidos por repartidores</h3>
                                <div className="admin-table-scroll">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre completo</th>
                                                <th>Entregados</th>
                                                <th>Cancelados</th>
                                                <th>Tiempo promedio</th>
                                                <th>Asignados</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tablaRepartidores.length > 0 ? (
                                                tablaRepartidores.map((r) => (
                                                    <tr key={r.id}>
                                                        <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                                                        <td className="admin-text-success" style={{ fontWeight: 700 }}>{r.entregados}</td>
                                                        <td className="admin-text-error" style={{ fontWeight: 700 }}>{r.cancelados}</td>
                                                        <td>{r.tiempoPromedio} min</td>
                                                        <td>{r.asignados}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="admin-table__empty">
                                                        No hay repartidores con pedidos asignados para los filtros seleccionados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="admin-panel-card">
                                <h3>Cantidad de pedidos asignados por repartidores</h3>
                                <div style={{ width: '100%', height: 280 }}>
                                    {pedidosAsignadosPorRepartidor && pedidosAsignadosPorRepartidor.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={pedidosAsignadosPorRepartidor}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E6E9ED" />
                                                <XAxis dataKey="nombre" tick={TICK} axisLine={EJE} tickLine={false} />
                                                <YAxis tick={TICK} axisLine={EJE} tickLine={false} />
                                                <Tooltip contentStyle={TOOLTIP_ESTILO} cursor={{ fill: 'rgba(23, 36, 58, 0.04)' }} />
                                                <Bar dataKey="cantidad" fill="#F47A16" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <GraficoVacio>No hay repartidores con pedidos asignados para los filtros seleccionados.</GraficoVacio>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mapa de pedidos por repartidores */}
                        <div className="admin-panel-card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon name="map" size={18} />
                                Mapa de pedidos por repartidores
                            </h3>
                            <MapaRepartidores datosMapa={mapaFlota} />
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};