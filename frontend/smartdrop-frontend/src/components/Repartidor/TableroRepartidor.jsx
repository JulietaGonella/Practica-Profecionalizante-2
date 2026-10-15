// src/components/Repartidor/TableroRepartidor.jsx
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
import './CSS/Repartidor.css';
import { getMiTableroRepartidor } from '../../api/tableroService';

const FECHA_CORTE = '2026-10-01';
const COLOR_REPARTIDOR = '#F47A16';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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

const formatearMoneda = (valor) =>
  Number(valor || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const formatearKilometros = (valor) =>
  Number(valor || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  });

const obtenerCentroMapa = (puntos) => {
  if (!puntos.length) return { lat: -32.4075, lng: -63.24 };

  return {
    lat: puntos.reduce((total, punto) => total + Number(punto.latitud), 0) / puntos.length,
    lng: puntos.reduce((total, punto) => total + Number(punto.longitud), 0) / puntos.length
  };
};

/* ==========================================================================
   MAPA GOOGLE
   ========================================================================== */
const MapaGoogle = ({ puntos }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  if (loadError) {
    return (
      <MapaOpenStreetMap
        puntos={puntos}
        aviso="No se pudo cargar Google Maps; se muestra el mapa alternativo."
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="repartidor-map-canvas repartidor-map-message" style={{ height: '340px', display: 'grid', placeItems: 'center' }}>
        <span className="repartidor-spinner" />
        <p>Cargando mapa…</p>
      </div>
    );
  }

  const centro = obtenerCentroMapa(puntos);

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '340px', borderRadius: '11px' }}
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
        const position = {
          lat: Number(punto.latitud),
          lng: Number(punto.longitud)
        };
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
              label={{
                text: String(cantidad),
                color: '#17243A',
                fontWeight: 'bold'
              }}
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

/* ==========================================================================
   MAPA ALTERNATIVO OPENSTREETMAP
   ========================================================================== */
const MapaOpenStreetMap = ({ puntos, aviso }) => {
  const centro = obtenerCentroMapa(puntos);
  const centroLeaflet = [centro.lat, centro.lng];

  return (
    <div className="repartidor-map-wrap">
      {aviso && (
        <p className="repartidor-map-note">{aviso}</p>
      )}

      <div className="repartidor-map-canvas" style={{ height: '340px' }}>
        <MapContainer
          center={centroLeaflet}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {puntos.map((punto) => (
            <CircleMarker
              key={`${punto.latitud}-${punto.longitud}`}
              center={[
                Number(punto.latitud),
                Number(punto.longitud)
              ]}
              radius={8 + Math.min(Number(punto.cantidad_pedidos) || 1, 20)}
              pathOptions={{
                color: COLOR_REPARTIDOR,
                fillColor: COLOR_REPARTIDOR,
                fillOpacity: 0.25
              }}
            >
              <Popup>
                {Number(punto.cantidad_pedidos) || 1} entregas
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE COMPARTIDO: MAPA Y REFERENCIA DE ENTREGAS
   ========================================================================== */
const MapaPedidos = ({ puntos, nombre }) => {
  if (!puntos.length) {
    return (
      <div className="repartidor-map-canvas repartidor-map-message" style={{ height: '340px', display: 'grid', placeItems: 'center' }}>
        <p>No hay entregas con coordenadas para este período.</p>
      </div>
    );
  }

  return (
    <div className="repartidor-map-wrap">
      {GOOGLE_MAPS_API_KEY
        ? <MapaGoogle puntos={puntos} />
        : <MapaOpenStreetMap puntos={puntos} />}

      <div className="repartidor-map-legend" style={{ marginTop: '10px' }}>
        <span>
          <span className="repartidor-map-legend__dot" style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLOR_REPARTIDOR, display: 'inline-block' }} />
          {nombre || 'Repartidor'}
        </span>

        <span className="repartidor-muted">
          {puntos.reduce(
            (total, punto) => total + Number(punto.cantidad_pedidos || 0),
            0
          )}{' '}
          entregas marcadas
        </span>
      </div>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE PRINCIPAL: TABLERO DEL REPARTIDOR
   ========================================================================== */
export const TableroRepartidor = () => {
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState('30');
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
          params.fechaInicio = FECHA_CORTE;
        } else {
          const fechaInicio = new Date();
          fechaInicio.setDate(fechaInicio.getDate() - Number(periodo) + 1);

          params.fechaInicio = fechaLocalISO(fechaInicio);
          params.fechaFin = fechaLocalISO(new Date());
        }

        const data = await getMiTableroRepartidor(params);

        if (activo) setDashboard(data);
      } catch (err) {
        if (activo) {
          setError(
            err.response?.data?.error ||
            'No se pudieron cargar las estadísticas del repartidor.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarTablero();

    return () => {
      activo = false;
    };
  }, [periodo]);

  const pedidos = dashboard?.pedidos || [];
  const paginasTotales = Math.max(
    1,
    Math.ceil(pedidos.length / filasPorPagina)
  );
  const paginaActual = Math.min(pagina, paginasTotales);
  const inicioFilas = (paginaActual - 1) * filasPorPagina;
  const pedidosVisibles = pedidos.slice(
    inicioFilas,
    inicioFilas + filasPorPagina
  );

  const nombreRepartidor =
    dashboard?.repartidor?.nombre ||
    dashboard?.repartidor?.username ||
    'Repartidor';

  const puntosGrafico = dashboard?.pedidosPorFechaEstado || [];
  const maxCantidad = Math.max(
    1,
    ...puntosGrafico.map((punto) => punto.Entregado)
  );
  const ticksYAxis = maxCantidad <= 1
    ? [0, 0.25, 0.5, 0.75, 1]
    : undefined;

  return (
    <main className="repartidor-container repartidor-container--wide repartidor-dash">
      <header className="repartidor-page-head">
        <div className="repartidor-brand">
          <span className="repartidor-brand__mark repartidor-dashboard-logo">
            SD
          </span>

          <div>
            <h1 className="repartidor-page-title">
              Tablero General
            </h1>
            <p className="repartidor-page-sub">
              Repartidor · {nombreRepartidor}
            </p>
          </div>
        </div>

        <div className="repartidor-page-head__actions">
          <label className="repartidor-field">
            <span>Período de consulta</span>

            <select
              className="repartidor-select"
              value={periodo}
              onChange={(e) => {
                setPeriodo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="todo">Desde el 01/10/2026</option>
            </select>
          </label>

          <button
            type="button"
            className="repartidor-btn repartidor-btn--outline"
            onClick={() => navigate('/repartidor/inicio')}
          >
            <span aria-hidden="true">←</span>
            Volver al panel
          </button>
        </div>
      </header>

      {error && (
        <div
          className="repartidor-alert repartidor-alert--danger"
          role="alert"
        >
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {cargando && !dashboard ? (
        <div className="repartidor-state">
          <span className="repartidor-spinner" />
          <p>Cargando tablero…</p>
        </div>
      ) : (
        <>
          <section
            className="repartidor-kpi-grid repartidor-dashboard-kpis"
            aria-label="Indicadores principales"
          >
            <article className="repartidor-kpi repartidor-kpi--orange">
              <div className="repartidor-kpi__top">
                <span className="repartidor-kpi__icon" aria-hidden="true">
                  $
                </span>
                <span className="repartidor-kpi__label">
                  Ingresos totales
                </span>
              </div>

              <strong className="repartidor-kpi__value">
                {formatearMoneda(dashboard?.kpis?.ingresosTotales)}
              </strong>
              <span className="repartidor-kpi__caption">
                Ganancias del período seleccionado
              </span>
            </article>

            <article className="repartidor-kpi repartidor-kpi--success">
              <div className="repartidor-kpi__top">
                <span className="repartidor-kpi__icon" aria-hidden="true">
                  ✓
                </span>
                <span className="repartidor-kpi__label">
                  Pedidos entregados
                </span>
              </div>

              <strong className="repartidor-kpi__value">
                {dashboard?.kpis?.pedidosEntregados || 0}
              </strong>
              <span className="repartidor-kpi__caption">
                Entregas completadas
              </span>
            </article>

            <article className="repartidor-kpi repartidor-kpi--info">
              <div className="repartidor-kpi__top">
                <span className="repartidor-kpi__icon" aria-hidden="true">
                  ↗
                </span>
                <span className="repartidor-kpi__label">
                  Kilómetros recorridos
                </span>
              </div>

              <strong className="repartidor-kpi__value">
                {formatearKilometros(dashboard?.kpis?.kmRecorridos)} km
              </strong>
              <span className="repartidor-kpi__caption">
                Distancia registrada
              </span>
            </article>
          </section>

          <section className="repartidor-panel-card">
            <div className="repartidor-panel-card__head">
              <div>
                <h2>Evolución diaria de entregas</h2>
                <p className="repartidor-dashboard-description">
                  Cantidad de pedidos entregados por fecha
                </p>
              </div>

              {cargando && (
                <span className="repartidor-badge repartidor-badge--info">
                  Actualizando…
                </span>
              )}
            </div>

            <div className="repartidor-chart repartidor-dashboard-line-chart">
              {puntosGrafico.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={puntosGrafico}
                    margin={{ top: 10, right: 20, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E6E9ED"
                    />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={formatearFecha}
                      minTickGap={24}
                      tick={{ fontSize: 12, fill: '#667085' }}
                    />
                    <YAxis
                      domain={[0, maxCantidad <= 1 ? 1 : 'auto']}
                      ticks={ticksYAxis}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#667085' }}
                    />
                    <Tooltip
                      labelFormatter={formatearFecha}
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #E6E9ED'
                      }}
                    />
                    <Legend />

                    <Line
                      name="Pedidos Entregados"
                      type="monotone"
                      dataKey="Entregado"
                      stroke="#16804A"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="repartidor-chart-empty">
                  <span className="repartidor-dashboard-empty-icon" aria-hidden="true">
                    ↗
                  </span>
                  <p>No hay entregas registradas para este período.</p>
                </div>
              )}
            </div>
          </section>

          <section className="repartidor-panel-card">
            <div className="repartidor-panel-card__head">
              <div>
                <h2>Pedidos repartidos</h2>
                <p className="repartidor-dashboard-description">
                  Historial de pedidos y ganancias por entrega
                </p>
              </div>

              <span className="repartidor-badge repartidor-badge--neutral">
                {pedidos.length} registros
              </span>
            </div>

            <div className="repartidor-table-scroll">
              <table className="repartidor-table">
                <thead>
                  <tr>
                    {[
                      'N° pedido',
                      'Fecha',
                      'Km recorridos',
                      'Ganancia repartidor',
                      'Estado'
                    ].map((titulo) => (
                      <th key={titulo}>{titulo}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {pedidosVisibles.length ? (
                    pedidosVisibles.map((pedido) => {
                      const entregado = Number(pedido.IDestado) === 3;

                      return (
                        <tr key={pedido.orden_id}>
                          <td className="is-strong is-nowrap">
                            #{pedido.orden_id}
                          </td>

                          <td className="is-nowrap">
                            {formatearFecha(pedido.fecha_clave)}
                          </td>

                          <td className="is-nowrap">
                            {formatearKilometros(pedido.distancia_km)} km
                          </td>

                          <td className="is-strong is-nowrap">
                            {formatearMoneda(pedido.ganancia_repartidor)}
                          </td>

                          <td>
                            <span
                              className={`repartidor-badge ${
                                entregado
                                  ? 'repartidor-badge--success'
                                  : 'repartidor-badge--error'
                              }`}
                            >
                              <span className="repartidor-dot" />
                              {entregado ? 'Entregado' : 'Cancelado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="is-empty">
                        No hay pedidos repartidos para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="repartidor-pagination">
              <label>
                Filas por página

                <select
                  className="repartidor-select repartidor-select--sm"
                  value={filasPorPagina}
                  onChange={(e) => {
                    setFilasPorPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                >
                  <option value={7}>7</option>
                  <option value={14}>14</option>
                  <option value={28}>28</option>
                </select>
              </label>

              <span>
                {pedidos.length
                  ? `${inicioFilas + 1}-${Math.min(
                      inicioFilas + filasPorPagina,
                      pedidos.length
                    )} de ${pedidos.length}`
                  : '0 de 0'}
              </span>

              <div className="repartidor-pagination__nav">
                <button
                  type="button"
                  className="repartidor-icon-btn"
                  aria-label="Página anterior"
                  disabled={paginaActual <= 1}
                  onClick={() =>
                    setPagina((actual) => Math.max(1, actual - 1))
                  }
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="repartidor-icon-btn"
                  aria-label="Página siguiente"
                  disabled={paginaActual >= paginasTotales}
                  onClick={() =>
                    setPagina((actual) =>
                      Math.min(paginasTotales, actual + 1)
                    )
                  }
                >
                  ›
                </button>
              </div>
            </footer>
          </section>

          <section className="repartidor-panel-card">
            <div className="repartidor-panel-card__head">
              <div>
                <h2>Mapa de pedidos</h2>
                <p className="repartidor-dashboard-description">
                  Distribución geográfica de las entregas del período
                </p>
              </div>

              <span className="repartidor-badge repartidor-badge--orange">
                {nombreRepartidor}
              </span>
            </div>

            <MapaPedidos
              puntos={dashboard?.mapaPedidos || []}
              nombre={nombreRepartidor}
            />
          </section>
        </>
      )}
    </main>
  );
};