import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Circle, GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getMiTableroRepartidor } from '../../api/tableroService';

const FECHA_CORTE = '2026-10-01';
const COLOR_REPARTIDOR = '#15aabf';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ESTILO_PANEL = {
  backgroundColor: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  padding: '1.1rem'
};

const fechaLocalISO = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(fecha);
};

const formatearMoneda = (valor) => Number(valor || 0).toLocaleString('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatearKilometros = (valor) => Number(valor || 0).toLocaleString('es-AR', {
  minimumFractionDigits: 1, // Muestra al menos 1 decimal (ej: 4,5 km)
  maximumFractionDigits: 2  // Muestra hasta 2 decimales si existen (ej: 4,52 km)
});

const obtenerCentroMapa = (puntos) => {
  if (!puntos.length) return { lat: -32.4075, lng: -63.24 };
  return {
    lat: puntos.reduce((total, punto) => total + Number(punto.latitud), 0) / puntos.length,
    lng: puntos.reduce((total, punto) => total + Number(punto.longitud), 0) / puntos.length
  };
};

const MapaGoogle = ({ puntos }) => {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  if (loadError) {
    return <MapaOpenStreetMap puntos={puntos} aviso="No se pudo cargar Google Maps; se muestra el mapa alternativo." />;
  }
  if (!isLoaded) return <div style={{ height: 340, display: 'grid', placeItems: 'center', color: '#6c757d' }}>Cargando mapa…</div>;

  const centro = obtenerCentroMapa(puntos);

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '340px', borderRadius: '6px' }}
      center={centro}
      zoom={12}
      options={{
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
        mapTypeControl: false,
        clickableIcons: false
      }}
    >
      {puntos.map((punto) => {
        const position = { lat: Number(punto.latitud), lng: Number(punto.longitud) };
        const cantidad = Number(punto.cantidad_pedidos) || 1;

        return (
          <Fragment key={`${position.lat}-${position.lng}`}>
            <Circle
              center={position}
              radius={90 + Math.min(cantidad, 20) * 35}
              options={{
                fillColor: COLOR_REPARTIDOR,
                fillOpacity: 0.2,
                strokeColor: COLOR_REPARTIDOR,
                strokeOpacity: 0.65,
                strokeWeight: 1
              }}
            />
            <Marker
              position={position}
              label={{ text: String(cantidad), color: '#075985', fontWeight: 'bold' }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 11,
                fillColor: '#fff',
                fillOpacity: 0.95,
                strokeColor: COLOR_REPARTIDOR,
                strokeWeight: 2
              }}
              title={`${cantidad} ${cantidad === 1 ? 'entrega' : 'entregas'}`}
            />
          </Fragment>
        );
      })}
    </GoogleMap>
  );
};

const MapaOpenStreetMap = ({ puntos, aviso }) => {
  const centro = obtenerCentroMapa(puntos);
  const centroLeaflet = [centro.lat, centro.lng];

  return (
    <div>
      {aviso && <p style={{ margin: '0 0 0.5rem', color: '#946b00', fontSize: '0.82rem' }}>{aviso}</p>}
      <div style={{ height: 340, border: '1px solid #dee2e6', borderRadius: '6px', overflow: 'hidden' }}>
        <MapContainer center={centroLeaflet} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {puntos.map((punto) => (
            <CircleMarker
              key={`${punto.latitud}-${punto.longitud}`}
              center={[Number(punto.latitud), Number(punto.longitud)]}
              radius={8 + Math.min(Number(punto.cantidad_pedidos) || 1, 20)}
              pathOptions={{ color: COLOR_REPARTIDOR, fillColor: COLOR_REPARTIDOR, fillOpacity: 0.25 }}
            >
              <Popup>{Number(punto.cantidad_pedidos) || 1} entregas</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

const MapaPedidos = ({ puntos, nombre }) => {
  if (!puntos.length) {
    return <div style={{ height: 340, display: 'grid', placeItems: 'center', color: '#6c757d' }}>No hay entregas con coordenadas para este período.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.7rem' }}>
      {GOOGLE_MAPS_API_KEY
        ? <MapaGoogle puntos={puntos} />
        : <MapaOpenStreetMap puntos={puntos} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLOR_REPARTIDOR, display: 'inline-block' }} />
          {nombre || 'Repartidor'}
        </span>
        <span style={{ color: '#6c757d' }}>{puntos.reduce((total, punto) => total + Number(punto.cantidad_pedidos || 0), 0)} entregas marcadas</span>
      </div>
    </div>
  );
};

export const TableroRepartidor = () => {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState('30'); // Opción por defecto
  const [dashboard, setDashboard] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(7);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    const cargarTablero = async () => {
      setCargando(true);
      setError('');
      try {
        const params = {};

        if (periodo === 'todo') {
          // Si elige "Desde el 01/10/2026", se establece la fecha inicial fija
          params.fechaInicio = FECHA_CORTE; // '2026-10-01'
        } else {
          // Cálculo de días relativos (7, 30, 90)
          const fechaInicio = new Date();
          fechaInicio.setDate(fechaInicio.getDate() - Number(periodo) + 1);
          params.fechaInicio = fechaLocalISO(fechaInicio);
          params.fechaFin = fechaLocalISO(new Date());
        }

        const data = await getMiTableroRepartidor(params);
        if (activo) setDashboard(data);
      } catch (err) {
        if (activo) setError(err.response?.data?.error || 'No se pudieron cargar las estadísticas del repartidor.');
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarTablero();
    return () => { activo = false; };
  }, [periodo]);

  const pedidos = dashboard?.pedidos || [];
  const paginasTotales = Math.max(1, Math.ceil(pedidos.length / filasPorPagina));
  const paginaActual = Math.min(pagina, paginasTotales);
  const inicioFilas = (paginaActual - 1) * filasPorPagina;
  const pedidosVisibles = pedidos.slice(inicioFilas, inicioFilas + filasPorPagina);
  const nombreRepartidor = dashboard?.repartidor?.nombre || dashboard?.repartidor?.username || 'Repartidor';
  const puntosGrafico = dashboard?.pedidosPorFechaEstado || [];
  const maxCantidad = Math.max(1, ...puntosGrafico.map((punto) => punto.Entregado));
  const ticksYAxis = maxCantidad <= 1 ? [0, 0.25, 0.5, 0.75, 1] : undefined;

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '1.5rem', display: 'grid', gap: '1.2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#0b7285', fontWeight: 800, fontSize: '1.15rem' }}>smartdrop</span>
          <div style={{ borderLeft: '1px solid #dee2e6', paddingLeft: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.45rem', color: '#212529' }}>Tablero General - Repartidor</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#6c757d' }}>{nombreRepartidor}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: '0.3rem', color: '#495057', fontSize: '0.82rem', fontWeight: 600 }}>
            Período
            <select value={periodo} onChange={(e) => { setPeriodo(e.target.value); setPagina(1); }} style={{ minWidth: 170, padding: '0.55rem 0.7rem', border: '1px solid #ced4da', borderRadius: '6px', background: '#fff' }}>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="todo">Desde el 01/10/2026</option>
            </select>
          </label>
          <button onClick={() => navigate('/repartidor/inicio')} style={{ padding: '0.58rem 0.8rem', border: '1px solid #ced4da', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#343a40' }}>
            ← Volver al panel
          </button>
        </div>
      </header>

      {error && <div style={{ padding: '0.8rem 1rem', borderRadius: '6px', background: '#fff5f5', color: '#c92a2a', border: '1px solid #ffc9c9' }}>{error}</div>}

      {cargando && !dashboard ? (
        <div style={{ ...ESTILO_PANEL, minHeight: 180, display: 'grid', placeItems: 'center', color: '#6c757d' }}>Cargando tablero…</div>
      ) : (
        <>
          {/* ... dentro de la renderización del componente TableroRepartidor ... */}

          <section aria-label="Indicadores principales" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.9rem' }}>
            {/* Card 1: Ingresos Totales */}
            <div style={{ ...ESTILO_PANEL, borderTop: '3px solid #0b7285' }}>
              <span style={{ color: '#6c757d', fontSize: '0.88rem', fontWeight: 600 }}>Ingresos totales</span>
              <div style={{ marginTop: '0.3rem', fontSize: '1.8rem', lineHeight: 1.2, fontWeight: 700, color: '#0b7285' }}>
                {formatearMoneda(dashboard?.kpis?.ingresosTotales)}
              </div>
            </div>

            {/* Card 2: Pedidos Entregados */}
            <div style={{ ...ESTILO_PANEL, borderTop: '3px solid #2b8a3e' }}>
              <span style={{ color: '#6c757d', fontSize: '0.88rem', fontWeight: 600 }}>Pedidos entregados</span>
              <div style={{ marginTop: '0.3rem', fontSize: '2rem', lineHeight: 1.2, fontWeight: 700, color: '#2b8a3e' }}>
                {dashboard?.kpis?.pedidosEntregados || 0}
              </div>
            </div>

            {/* Card 3: Kilómetros recorridos */}
            <div style={{ ...ESTILO_PANEL, borderTop: '3px solid #15aabf' }}>
              <span style={{ color: '#6c757d', fontSize: '0.88rem', fontWeight: 600 }}>Kilómetros recorridos</span>
              <div style={{ marginTop: '0.3rem', fontSize: '2rem', lineHeight: 1.2, fontWeight: 700, color: '#0b7285' }}>
                {formatearKilometros(dashboard?.kpis?.kmRecorridos)}
              </div>
            </div>
          </section>

          <section style={ESTILO_PANEL}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#343a40' }}>Evolución diaria de entregas realizadas</h2>
              {cargando && <span style={{ color: '#6c757d', fontSize: '0.8rem' }}>Actualizando…</span>}
            </div>
            <div style={{ width: '100%', height: 300 }}>
              {puntosGrafico.length ? (
                <ResponsiveContainer>
                  <LineChart data={puntosGrafico} margin={{ top: 10, right: 20, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                    <XAxis dataKey="fecha" tickFormatter={formatearFecha} minTickGap={24} tick={{ fontSize: 12, fill: '#6c757d' }} />
                    <YAxis domain={[0, maxCantidad <= 1 ? 1 : 'auto']} ticks={ticksYAxis} allowDecimals={false} />
                    <Tooltip labelFormatter={formatearFecha} />
                    <Legend />
                    {/* Se mantiene solo la línea verde de pedidos entregados */}
                    <Line name="Pedidos Entregados" type="monotone" dataKey="Entregado" stroke="#2b8a3e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#868e96' }}>
                  No hay entregas registradas para este período.
                </div>
              )}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: '1rem', alignItems: 'start' }}>
            <div style={{ ...ESTILO_PANEL, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 0.8rem', fontSize: '1rem', color: '#343a40' }}>Tabla de pedidos repartidos</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: 600 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#495057', background: '#f1f3f5' }}>
                      {['N° pedido', 'Fecha', 'Km recorridos', 'Ganancia repartidor', 'Estado'].map((titulo) => <th key={titulo} style={{ padding: '0.65rem 0.55rem', whiteSpace: 'nowrap' }}>{titulo}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosVisibles.length ? pedidosVisibles.map((pedido) => {
                      const entregado = Number(pedido.IDestado) === 3;
                      return (
                        <tr key={pedido.orden_id} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '0.65rem 0.55rem' }}>#{pedido.orden_id}</td>
                          <td style={{ padding: '0.65rem 0.55rem', whiteSpace: 'nowrap' }}>{formatearFecha(pedido.fecha_clave)}</td>
                          <td style={{ padding: '0.65rem 0.55rem' }}>{formatearKilometros(pedido.distancia_km)}</td>
                          <td style={{ padding: '0.65rem 0.55rem', whiteSpace: 'nowrap' }}>{formatearMoneda(pedido.ganancia_repartidor)}</td>
                          <td style={{ padding: '0.65rem 0.55rem' }}>
                            <span style={{ padding: '0.22rem 0.5rem', borderRadius: '4px', color: entregado ? '#155724' : '#721c24', background: entregado ? '#d4edda' : '#f8d7da', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {entregado ? 'Entregado' : 'Cancelado'}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : <tr><td colSpan="5" style={{ padding: '1.2rem', textAlign: 'center', color: '#868e96' }}>No hay pedidos repartidos para este período.</td></tr>}
                  </tbody>
                </table>
              </div>
              <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.8rem', color: '#6c757d', fontSize: '0.82rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Filas
                  <select value={filasPorPagina} onChange={(e) => { setFilasPorPagina(Number(e.target.value)); setPagina(1); }} style={{ padding: '0.3rem', border: '1px solid #ced4da', borderRadius: '4px', background: '#fff' }}>
                    <option value={7}>7</option><option value={14}>14</option><option value={28}>28</option>
                  </select>
                </label>
                <span>{pedidos.length ? `${inicioFilas + 1}-${Math.min(inicioFilas + filasPorPagina, pedidos.length)} de ${pedidos.length}` : '0 de 0'}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" aria-label="Página anterior" disabled={paginaActual <= 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ced4da', borderRadius: '4px', background: '#fff', cursor: paginaActual <= 1 ? 'not-allowed' : 'pointer' }}>‹</button>
                  <button type="button" aria-label="Página siguiente" disabled={paginaActual >= paginasTotales} onClick={() => setPagina((actual) => Math.min(paginasTotales, actual + 1))} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ced4da', borderRadius: '4px', background: '#fff', cursor: paginaActual >= paginasTotales ? 'not-allowed' : 'pointer' }}>›</button>
                </div>
              </footer>
            </div>

            <div style={{ ...ESTILO_PANEL, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 0.8rem', fontSize: '1rem', color: '#343a40' }}>Mapa de pedidos por repartidor</h2>
              <MapaPedidos puntos={dashboard?.mapaPedidos || []} nombre={nombreRepartidor} />
            </div>
          </section>
        </>
      )}
    </main>
  );
};