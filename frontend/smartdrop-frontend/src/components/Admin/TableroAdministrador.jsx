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

const COLORES_PAGO = ['#1c7ed6', '#0ca678', '#f59f00', '#d9480f'];
const COLORES_ESTADO = { Entregado: '#2b8a3e', Cancelado: '#e03131' };

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

    const estiloContenedorFiltros = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        backgroundColor: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
    };

    const estiloLabel = {
        display: 'block',
        fontSize: '0.825rem',
        fontWeight: '600',
        color: '#495057',
        marginBottom: '0.4rem'
    };

    const estiloInputSelect = {
        width: '100%',
        padding: '0.6rem 0.75rem',
        borderRadius: '8px',
        border: '1px solid #ced4da',
        fontSize: '0.9rem',
        backgroundColor: '#fff',
        boxSizing: 'border-box'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Pestañas de Navegación */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #dee2e6', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setSubVista('general')}
                    style={{
                        padding: '0.6rem 1.2rem',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: subVista === 'general' ? '#0b7285' : '#f1f3f5',
                        color: subVista === 'general' ? '#fff' : '#495057'
                    }}
                >
                    📈 Tablero General Admin
                </button>
                <button
                    onClick={() => setSubVista('repartidores')}
                    style={{
                        padding: '0.6rem 1.2rem',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: subVista === 'repartidores' ? '#0b7285' : '#f1f3f5',
                        color: subVista === 'repartidores' ? '#fff' : '#495057'
                    }}
                >
                    🚴 Gestión de Repartidores
                </button>
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#ffe3e3', color: '#e03131', borderRadius: '8px' }}>
                    {error}
                </div>
            )}

            {/* VISTA 1: TABLERO GENERAL */}
            {subVista === 'general' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Tablero General - Administrador</h2>
                    </div>

                    {/* Filtros */}
                    <div style={estiloContenedorFiltros}>
                        <div>
                            <label style={estiloLabel}>Desde</label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                style={estiloInputSelect}
                            />
                        </div>

                        <div>
                            <label style={estiloLabel}>Hasta</label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                style={estiloInputSelect}
                            />
                        </div>

                        <div>
                            <label style={estiloLabel}>Categoría</label>
                            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={estiloInputSelect}>
                                <option value="todas">Todas las categorías</option>
                                {listaCategorias.map((cat) => (
                                    <option key={cat.id || cat.nombre} value={cat.nombre}>
                                        {cat.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={estiloLabel}>Estados de pedido</label>
                            <select value={estadoPedido} onChange={(e) => setEstadoPedido(e.target.value)} style={estiloInputSelect}>
                                <option value="todos">Todos los estados</option>
                                <option value="Entregado">Entregado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <label style={estiloLabel}>Tipo de pago</label>
                            <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} style={estiloInputSelect}>
                                <option value="todos">Todos los métodos</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="mercadopago">Mercado Pago</option>
                                <option value="tarjeta_credito">Tarjeta</option>
                            </select>
                        </div>
                    </div>

                    <p style={{ margin: '-0.8rem 0 0', color: '#6c757d', fontSize: '0.82rem' }}>
                        Los indicadores consideran pedidos creados desde el 01/10/2026 a las 14:54, cuando comenzó el registro de comisiones por producto.
                    </p>

                    {/* Tarjetas de KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '1.2rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <span style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>Total de Pedidos</span>
                            <h1 style={{ margin: '0.5rem 0 0', color: '#1c7ed6', fontSize: '2.5rem' }}>{kpisGeneral.totalPedidos}</h1>
                        </div>

                        <div style={{ padding: '1.2rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <span style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>Pedidos Entregados vs Cancelados</span>
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b8a3e', fontWeight: 'bold' }}>
                                    <span>1. Entregado</span>
                                    <span>{kpisGeneral.entregados}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e03131', fontWeight: 'bold' }}>
                                    <span>2. Cancelado</span>
                                    <span>{kpisGeneral.cancelados}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.2rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <span style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                {categoria === 'todas' ? 'Ingresos netos de la plataforma' : 'Comisiones de productos de la categoría'}
                            </span>
                            <h2 style={{ margin: '0.5rem 0 0', color: '#2b8a3e', fontSize: '1.8rem' }}>
                                $ {Number(kpisGeneral.ingresosPlataforma).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #dee2e6' }}>
                            <h3>Cantidad de Pedidos por Categoría</h3>
                            <div style={{ width: '100%', height: 300 }}>
                                {pedidosPorCategoria && pedidosPorCategoria.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={pedidosPorCategoria} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="categoria" type="category" width={110} style={{ fontSize: '0.8rem' }} />
                                            <Tooltip />
                                            <Bar dataKey="cantidad" fill="#1c7ed6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#868e96' }}>
                                        No hay datos de pedidos por categoría para los filtros seleccionados.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #dee2e6' }}>
                            <h3>Cantidad de Pedidos por Fecha y Estado</h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={pedidosPorFechaEstado}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="fecha" style={{ fontSize: '0.75rem' }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="Entregado" fill={COLORES_ESTADO.Entregado} />
                                        <Bar dataKey="Cancelado" fill={COLORES_ESTADO.Cancelado} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #dee2e6' }}>
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
                                                label={({ value }) => `${value}%`}
                                            >
                                                {metodosPago.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORES_PAGO[index % COLORES_PAGO.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(val) => `${val}%`} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#868e96' }}>
                                        No hay datos de métodos de pago para los filtros seleccionados.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* VISTA 2: GESTIÓN DE REPARTIDORES */}
            {subVista === 'repartidores' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Tablero General - Gestión de Repartidores</h2>
                    </div>

                    {/* Filtros */}
                    <div style={estiloContenedorFiltros}>
                        <div>
                            <label style={estiloLabel}>Desde</label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                style={estiloInputSelect}
                            />
                        </div>

                        <div>
                            <label style={estiloLabel}>Hasta</label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                style={estiloInputSelect}
                            />
                        </div>

                        <div>
                            <label style={estiloLabel}>Estado de pedido</label>
                            <select value={estadoPedido} onChange={(e) => setEstadoPedido(e.target.value)} style={estiloInputSelect}>
                                <option value="todos">Todos los estados</option>
                                <option value="Entregado">Entregado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <label style={estiloLabel}>Repartidores con pedidos</label>
                            <select value={repartidorFiltro} onChange={(e) => setRepartidorFiltro(e.target.value)} style={estiloInputSelect}>
                                <option value="todos">Todos los repartidores con pedidos</option>
                                {listaRepartidores.map((r) => (
                                    <option key={r.id} value={r.id}>{r.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tarjetas de KPIs Repartidores */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                            <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>Cantidad de Repartidores con Pedidos</span>
                            <h2 style={{ margin: '0.4rem 0 0', color: '#1c7ed6' }}>{kpisRepartidores.cantidadRepartidores}</h2>
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                            <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>Tiempo Promedio de Entrega</span>
                            <h2 style={{ margin: '0.4rem 0 0', color: '#7048e8' }}>{kpisRepartidores.tiempoPromedio} min</h2>
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                            <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>Porcentaje Pedidos Entregados</span>
                            <h2 style={{ margin: '0.4rem 0 0', color: '#2b8a3e' }}>{kpisRepartidores.porcentajeEntregados}%</h2>
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px' }}>
                            <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>Total de KM Recorridos</span>
                            <h2 style={{ margin: '0.4rem 0 0', color: '#d9480f' }}>{kpisRepartidores.kmRecorridos} km</h2>
                        </div>
                    </div>

                    {/* Tabla y Gráficos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #dee2e6', overflowX: 'auto' }}>
                            <h3>Tabla de Pedidos por Repartidores</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.8rem', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#e9ecef', textAlign: 'left' }}>
                                        <th style={{ padding: '0.6rem' }}>Nombre Completo</th>
                                        <th style={{ padding: '0.6rem' }}>Entregados</th>
                                        <th style={{ padding: '0.6rem' }}>Cancelados</th>
                                        <th style={{ padding: '0.6rem' }}>Tiempo Promedio</th>
                                        <th style={{ padding: '0.6rem' }}>Asignados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tablaRepartidores.length > 0 ? (
                                        tablaRepartidores.map((r) => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                                                <td style={{ padding: '0.6rem' }}>{r.nombre}</td>
                                                <td style={{ padding: '0.6rem', color: '#2b8a3e', fontWeight: 'bold' }}>{r.entregados}</td>
                                                <td style={{ padding: '0.6rem', color: '#e03131', fontWeight: 'bold' }}>{r.cancelados}</td>
                                                <td style={{ padding: '0.6rem' }}>{r.tiempoPromedio} min</td>
                                                <td style={{ padding: '0.6rem' }}>{r.asignados}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                                                No hay repartidores con pedidos asignados para los filtros seleccionados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #dee2e6' }}>
                            <h3>Cantidad de Pedidos Asignados por Repartidores</h3>
                            <div style={{ width: '100%', height: 280 }}>
                                {pedidosAsignadosPorRepartidor && pedidosAsignadosPorRepartidor.length > 0 ? (
                                    <ResponsiveContainer>
                                        <BarChart data={pedidosAsignadosPorRepartidor}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="nombre" style={{ fontSize: '0.75rem' }} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="cantidad" fill="#7048e8" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#868e96' }}>
                                        No hay repartidores con pedidos asignados para los filtros seleccionados.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mapa de Pedidos por Repartidores */}
                    <div style={{ backgroundColor: '#fff', padding: '1.2rem', borderRadius: '10px', border: '1px solid #dee2e6' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Mapa de Pedidos por Repartidores</h3>
                        <MapaRepartidores datosMapa={mapaFlota} />
                    </div>
                </>
            )}

        </div>
    );
};