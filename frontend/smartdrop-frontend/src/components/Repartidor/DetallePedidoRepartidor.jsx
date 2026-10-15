// src/components/Repartidor/DetallePedidoRepartidor.jsx
import { useEffect, useState, useMemo, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPedidoAsignado,
  simularRecorridoPedido,
  entregarPedido,
  liberarPedidoRepartidor,
  confirmarRetiroLocal
} from '../../api/repartidorService';
import { NotificationMenu } from '../Common/NotificationMenu';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import './CSS/Repartidor.css';

/* ============================================================
   🗺️ ICONOS ILUSTRADOS PERSONALIZADOS PARA EL MAPA
   ============================================================ */

const iconoRepartidor = L.divIcon({
  className: 'custom-marker-repartidor',
  html: `
    <div style="
      background-color: #1c7ed6;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">
      🚴
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const iconoCliente = L.divIcon({
  className: 'custom-marker-cliente',
  html: `
    <div style="
      background-color: #2b8a3e;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">
      🏠
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const iconoLocal = (esSiguiente, retirado, todosRechazados) => {
  let bgColor = '#868e96'; // Gris = en espera
  let emoji = '🏪';
  let opacity = '1';

  if (todosRechazados) {
    bgColor = '#e03131'; // Rojo = Rechazado
    emoji = '❌';
    opacity = '0.6';
  } else if (retirado) {
    bgColor = '#20c997'; // Verde = retirado
  } else if (esSiguiente) {
    bgColor = '#fd7e14'; // Naranja = siguiente parada
  }

  return L.divIcon({
    className: 'custom-marker-local',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
        opacity: ${opacity};
      ">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const formatearTelefonoWA = (telefono) => {
  if (!telefono) return '';
  const numLimpio = telefono.replace(/\D/g, '');
  return numLimpio.startsWith('54') ? numLimpio : `54${numLimpio}`;
};

const UMBRAL_DISTANCIA_METROS = 100;

const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;

  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Componente auxiliar para ajustar el encuadre del mapa abarcando solo Repartidor y Destino Actual
const AjustarVistaMapa = ({ puntos }) => {
  const map = useMap();

  useEffect(() => {
    const puntosValidos = puntos.filter(
      (p) => p && p[0] != null && p[1] != null && !isNaN(p[0]) && !isNaN(p[1])
    );

    if (puntosValidos.length === 1) {
      map.panTo(puntosValidos[0], { animate: true, duration: 0.8 });
    } else if (puntosValidos.length > 1) {
      const bounds = L.latLngBounds(puntosValidos);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true, duration: 0.8 });
    }
  }, [JSON.stringify(puntos), map]);

  return null;
};

export const DetallePedidoRepartidor = () => {
  const { ordenId } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [accionProcesando, setAccionProcesando] = useState('');
  const [localAConfirmar, setLocalAConfirmar] = useState(null);

  // 🟢 Estados para modales estéticos (Reemplazo de alert y window.confirm)
  const [modalAviso, setModalAviso] = useState(null); // { titulo: '', mensaje: '', callback: null }
  const [modalConfirmacion, setModalConfirmacion] = useState(null); // { titulo: '', mensaje: '', onConfirm: null }

  // 🗺️ Estado para almacenar los puntos por calle obtenidos de OSRM
  const [rutaCalles, setRutaCalles] = useState([]);
  const esPedidoEntregado = Number(pedido?.IDestado) === 3;

  const cargarPedido = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPedidoAsignado(ordenId);
      setPedido(data);
    } catch (err) {
      console.error('Error al cargar el pedido:', err);
      setError(
        err.response?.data?.error ||
        'No se pudo cargar la información del pedido.'
      );
    } finally {
      setLoading(false);
    }
  };

  const actualizarPedido = async () => {
    try {
      const data = await getPedidoAsignado(ordenId);
      setPedido(data);
    } catch (err) {
      console.error('Error actualizando pedido:', err);
    }
  };

  useEffect(() => {
    cargarPedido();
  }, [ordenId]);

  useEffect(() => {
    if (Number(pedido?.IDestado) === 3) return undefined;

    const intervalo = setInterval(actualizarPedido, 5000);
    return () => clearInterval(intervalo);
  }, [ordenId, pedido?.IDestado]);

  const handleSimularRecorrido = async () => {
    if (!pedido?.IDrepartidor) {
      setModalAviso({
        titulo: '⚠️ Aviso',
        mensaje: 'No se encontró el repartidor asignado.'
      });
      return;
    }

    try {
      setAccionProcesando('recorrido');
      await simularRecorridoPedido(
        pedido.IDrepartidor,
        Number(ordenId)
      );
      await cargarPedido();
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error de Simulación',
        mensaje: err.response?.data?.error || 'No se pudo iniciar la simulación del recorrido.'
      });
    } finally {
      setAccionProcesando('');
    }
  };

  const handleEjecutarConfirmacionRetiro = async () => {
    if (!localAConfirmar) return;

    try {
      setAccionProcesando(`retiro_${localAConfirmar.id}`);

      await confirmarRetiroLocal(Number(ordenId), {
        IDlocal: localAConfirmar.id
      });

      setLocalAConfirmar(null);
      await cargarPedido();

    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error de Retiro',
        mensaje: err.response?.data?.error || `No se pudo confirmar el retiro en ${localAConfirmar.nombre}.`
      });
    } finally {
      setAccionProcesando('');
    }
  };

  const handleEntregar = async () => {
    if (!otp.trim()) {
      setModalAviso({
        titulo: '⚠️ Código OTP Requerido',
        mensaje: 'Ingresá el código OTP que te proporciona el cliente.'
      });
      return;
    }

    try {
      setAccionProcesando('entrega');
      await entregarPedido(Number(ordenId), otp.trim());
      setModalAviso({
        titulo: '✅ Pedido Entregado',
        mensaje: 'Pedido entregado correctamente.',
        callback: () => navigate('/repartidor/inicio')
      });
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error de Entrega',
        mensaje: err.response?.data?.error || 'No se pudo confirmar la entrega.'
      });
    } finally {
      setAccionProcesando('');
    }
  };

  const handleLiberarPedido = () => {
    setModalConfirmacion({
      titulo: '⚠️ Liberar Viaje',
      mensaje: '¿Estás seguro de que deseas rechazar/liberar este pedido? El pedido volverá a la lista de disponibles para otros repartidores.',
      onConfirm: async () => {
        setModalConfirmacion(null);
        try {
          setAccionProcesando('liberar');
          await liberarPedidoRepartidor(Number(ordenId), {});
          setModalAviso({
            titulo: '✅ Pedido Liberado',
            mensaje: 'Pedido liberado correctamente. Volviendo al listado.',
            callback: () => navigate('/repartidor/inicio')
          });
        } catch (err) {
          setModalAviso({
            titulo: '⚠️ Error',
            mensaje: err.response?.data?.error || 'No se pudo liberar el pedido.'
          });
        } finally {
          setAccionProcesando('');
        }
      }
    });
  };

  // 1. Agrupar productos por local y calcular rechazos / retiros
  const localesMap = new Map();

  pedido?.productos?.forEach((p) => {
    if (!p.local) return;
    const idLocal = p.IDlocal || p.local;

    const localRutaInfo = pedido?.localesRuta?.find(
      (l) => Number(l.IDlocal ?? l.id ?? l.localId) === Number(idLocal)
    );

    const sensibilidadProd = Number(
      localRutaInfo?.maxSensibilidad ??
      localRutaInfo?.max_sensibilidad ??
      p.nivel_sensibilidad ??
      1
    );

    const latLocal = p.latitud_local != null
      ? Number(p.latitud_local)
      : (localRutaInfo?.latitud ? Number(localRutaInfo.latitud) : null);
    const lngLocal = p.longitud_local != null
      ? Number(p.longitud_local)
      : (localRutaInfo?.longitud ? Number(localRutaInfo.longitud) : null);

    const estadoDetalleId = Number(p.IDestado_detalle || p.IDestado_item || p.IDestado);
    const esRechazado = estadoDetalleId === 6;

    const yaRetirado =
      !esRechazado && (esPedidoEntregado ||
        localRutaInfo?.retirado === 1 ||
        localRutaInfo?.retirado === true ||
        pedido?.retiros_realizados?.includes(idLocal) ||
        p.retirado === true ||
        estadoDetalleId === 8
      );

    if (!localesMap.has(idLocal)) {
      localesMap.set(idLocal, {
        id: Number(idLocal),
        nombre: p.local,
        telefono: p.telefono_local,
        direccion: p.direccion_local,
        latitud: latLocal,
        longitud: lngLocal,
        totalProductos: 0,
        rechazadosCount: 0,
        retiradosCount: 0,
        maxSensibilidad: sensibilidadProd,
        items: []
      });
    }

    const localExistente = localesMap.get(idLocal);
    localExistente.totalProductos += 1;
    if (esRechazado) localExistente.rechazadosCount += 1;
    if (yaRetirado) localExistente.retiradosCount += 1;

    if (sensibilidadProd > localExistente.maxSensibilidad) {
      localExistente.maxSensibilidad = sensibilidadProd;
    }

    localExistente.items.push(p);
  });

  // Calcular estado del local
  localesMap.forEach((local) => {
    local.todosRechazados = local.totalProductos > 0 && local.rechazadosCount === local.totalProductos;
    local.retirado = !local.todosRechazados && ((local.retiradosCount + local.rechazadosCount) === local.totalProductos);
  });

  const getOrdenRutaBackend = (idLocal) => {
    const listaRuta = pedido?.localesRuta || pedido?.localesOrdenados || pedido?.locales_ruta || [];
    if (!Array.isArray(listaRuta) || listaRuta.length === 0) return -1;

    return listaRuta.findIndex(
      (l) => Number(l.IDlocal ?? l.id ?? l.localId ?? l.IDlocal_orden) === Number(idLocal)
    );
  };

  const localesOrdenados = Array.from(localesMap.values()).sort((a, b) => {
    const aFinalizado = a.retirado || a.todosRechazados;
    const bFinalizado = b.retirado || b.todosRechazados;

    if (aFinalizado !== bFinalizado) {
      return aFinalizado ? 1 : -1;
    }

    const idxA = getOrdenRutaBackend(a.id);
    const idxB = getOrdenRutaBackend(b.id);

    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }

    if (a.maxSensibilidad !== b.maxSensibilidad) {
      return a.maxSensibilidad - b.maxSensibilidad;
    }

    return a.id - b.id;
  });

  const repLat = pedido?.repartidor_latitud != null ? Number(pedido.repartidor_latitud) : null;
  const repLng = pedido?.repartidor_longitud != null ? Number(pedido.repartidor_longitud) : null;

  const localesInvolucrados = localesOrdenados.map((local) => {
    const distanciaMetros = (repLat != null && repLng != null && local.latitud != null && local.longitud != null)
      ? Math.round(calcularDistanciaMetros(repLat, repLng, local.latitud, local.longitud))
      : null;

    const estaCerca = distanciaMetros !== null ? distanciaMetros <= UMBRAL_DISTANCIA_METROS : true;

    const productosListos = local.items.every((it) => {
      const st = Number(it.IDestado_detalle || it.IDestado_item || it.IDestado);
      return st === 7 || st === 8 || st === 6;
    });

    return {
      ...local,
      distanciaMetros,
      estaCerca,
      productosListos
    };
  });

  const primerLocalPendiente = localesInvolucrados.find((l) => !l.retirado && !l.todosRechazados);
  const todosLocalesListos = localesInvolucrados.length === 0 || localesInvolucrados.every((l) => l.retirado || l.todosRechazados);

  const destinoLat = primerLocalPendiente?.latitud != null
    ? Number(primerLocalPendiente.latitud)
    : (todosLocalesListos && pedido?.latitud_entrega != null ? Number(pedido.latitud_entrega) : null);

  const destinoLng = primerLocalPendiente?.longitud != null
    ? Number(primerLocalPendiente.longitud)
    : (todosLocalesListos && pedido?.longitud_entrega != null ? Number(pedido.longitud_entrega) : null);

  const etapaId = primerLocalPendiente?.id ?? (todosLocalesListos ? 'CLIENTE' : null);

  const trayectoCoords = [];
  const puntosMapa = [];

  if (repLat != null && repLng != null) {
    puntosMapa.push([repLat, repLng]);
    trayectoCoords.push([repLat, repLng]);

    if (destinoLat != null && destinoLng != null) {
      puntosMapa.push([destinoLat, destinoLng]);
      trayectoCoords.push([destinoLat, destinoLng]);
    }
  }

  const rutaRestante = useMemo(() => {
    if (!rutaCalles || rutaCalles.length === 0 || repLat == null || repLng == null) {
      return rutaCalles;
    }

    let minDistancia = Infinity;
    let indiceCercano = 0;

    rutaCalles.forEach((punto, index) => {
      const dist = calcularDistanciaMetros(repLat, repLng, punto[0], punto[1]);
      if (dist < minDistancia) {
        minDistancia = dist;
        indiceCercano = index;
      }
    });

    const puntosProximos = rutaCalles.slice(indiceCercano);
    return [[repLat, repLng], ...puntosProximos];
  }, [rutaCalles, repLat, repLng]);

  useEffect(() => {
    if (esPedidoEntregado || repLat == null || repLng == null || destinoLat == null || destinoLng == null || !etapaId) {
      setRutaCalles([]);
      return;
    }

    const consultarRutaOSRM = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${repLng},${repLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const puntosPorCalle = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRutaCalles(puntosPorCalle);
        } else {
          setRutaCalles([[repLat, repLng], [destinoLat, destinoLng]]);
        }
      } catch (err) {
        console.warn('Error obteniendo trazado OSRM:', err);
        setRutaCalles([[repLat, repLng], [destinoLat, destinoLng]]);
      }
    };

    consultarRutaOSRM();
  }, [etapaId, destinoLat, destinoLng, esPedidoEntregado]);

  if (loading) {
    return (
      <div className="repartidor-container">
        <div className="repartidor-state">
          <div className="repartidor-spinner"></div>
          <p>Cargando información del pedido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="repartidor-container">
        <div className="repartidor-alert repartidor-alert--danger">
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="repartidor-container">
        <div className="repartidor-state">
          <p>Pedido no encontrado.</p>
        </div>
      </div>
    );
  }

  const estadoGlobalId = Number(pedido.IDestado);

  const estaEnCamino = [5, 8].includes(estadoGlobalId);
  const estaFinalizado = [3, 6].includes(estadoGlobalId);

  const puedeIniciarRecorrido = !estaEnCamino && !estaFinalizado;
  const puedeLiberar = !estaEnCamino && !estaFinalizado;
  const puedeEntregar = estaEnCamino && !estaFinalizado;

  const enEsperadeRetiro = estaEnCamino && !todosLocalesListos;

  const esPagoEfectivo = Number(pedido.IDmetodo_pago) === 1 || String(pedido.metodo_pago).toLowerCase().includes('efectivo');

  const subtotalPedido = Number(
    pedido.subtotal_productos ?? pedido.subtotal ?? pedido.precio ?? 0
  );
  const costoEnvio = Number(pedido.costo_envio ?? 0);
  const totalOrdenCalculado = Number(
    pedido.total_orden ?? pedido.total ?? subtotalPedido + costoEnvio
  );

  const gananciaRepartidor = Number(
    pedido.ganancia_repartidor ?? costoEnvio * 0.85
  );
  const formatoMonto = (monto) => Number(monto || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const montoARendir = Number(
    pedido.efectivo_a_rendir ?? (esPagoEfectivo ? totalOrdenCalculado - gananciaRepartidor : 0)
  );

  return (
    <div className="repartidor-container repartidor-container--narrow">
      {/* 🟢 CABECERA SUPERIOR: Botón Volver + Menú de Notificaciones */}
      <div className="repartidor-topbar">
        <button
          onClick={() => navigate('/repartidor/inicio')}
          className="repartidor-btn repartidor-btn--outline repartidor-btn--sm"
        >
          ← Volver a mis pedidos
        </button>

        <NotificationMenu />
      </div>

      <div className="repartidor-detail-card">
        <div className="repartidor-detail-head">
          <div>
            <small>Detalle del pedido</small>
            <h1>Pedido #{pedido.IDorden}</h1>
          </div>

          <span className={`repartidor-badge ${estadoGlobalId === 5 ? 'repartidor-badge--orange' : 'repartidor-badge--info'}`}>
            <span className="repartidor-dot"></span>
            {pedido.estado_orden || 'Sin estado'}
          </span>
        </div>

        {!esPedidoEntregado && (
          <>
            {/* 🗺️ MAPA INTERACTIVO PROGRESIVO POR PARADAS */}
            <div className="repartidor-map-box">
              <h2 style={{ fontSize: '1rem', marginBottom: '8px' }}>🗺️ Navegación por Paradas en Tiempo Real</h2>

              {repLat != null && repLng != null ? (
                <div className="repartidor-map-canvas">
                  <MapContainer center={[repLat, repLng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <AjustarVistaMapa puntos={puntosMapa} />

                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Marker position={[repLat, repLng]} icon={iconoRepartidor}>
                      <Popup>
                        <strong>🚴 Repartidor</strong>
                        <br />
                        Ubicación actual
                      </Popup>
                    </Marker>

                    {localesInvolucrados.map((local) => {
                      if (local.latitud == null || local.longitud == null) return null;

                      const esSiguiente = primerLocalPendiente?.id === local.id;

                      return (
                        <Fragment key={`marker-local-${local.id}`}>
                          <Marker
                            position={[Number(local.latitud), Number(local.longitud)]}
                            icon={iconoLocal(esSiguiente, local.retirado, local.todosRechazados)}
                          >
                            <Popup>
                              <strong>
                                {esSiguiente
                                  ? `📍 Siguiente parada: ${local.nombre}`
                                  : local.todosRechazados
                                    ? `❌ Rechazado: ${local.nombre}`
                                    : local.retirado
                                      ? `✅ Retirado: ${local.nombre}`
                                      : `🏪 En espera: ${local.nombre}`}
                              </strong>
                              <br />
                              {local.direccion && (
                                <>
                                  <span>{local.direccion}</span>
                                  <br />
                                </>
                              )}
                              {esSiguiente && local.distanciaMetros != null && (
                                <span>Distancia: {local.distanciaMetros}m</span>
                              )}
                            </Popup>
                          </Marker>

                          {esSiguiente && (
                            <Circle
                              center={[Number(local.latitud), Number(local.longitud)]}
                              radius={UMBRAL_DISTANCIA_METROS}
                              pathOptions={{
                                color: local.estaCerca ? '#20c997' : '#fd7e14',
                                fillColor: local.estaCerca ? '#20c997' : '#fd7e14',
                                fillOpacity: 0.2
                              }}
                            />
                          )}
                        </Fragment>
                      );
                    })}

                    {pedido.latitud_entrega != null && pedido.longitud_entrega != null && (
                      <Marker
                        position={[Number(pedido.latitud_entrega), Number(pedido.longitud_entrega)]}
                        icon={iconoCliente}
                      >
                        <Popup>
                          <strong>🏠 Destino final del Cliente</strong>
                          <br />
                          {pedido.direccion_entrega || pedido.direccion_cliente}
                        </Popup>
                      </Marker>
                    )}

                    {(rutaRestante.length > 0 || trayectoCoords.length >= 2) && (
                      <Polyline
                        positions={rutaRestante.length > 0 ? rutaRestante : trayectoCoords}
                        pathOptions={{
                          color: '#1c7ed6',
                          weight: 5,
                          opacity: 0.85,
                          dashArray: '8, 12',
                          lineCap: 'round'
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
              ) : (
                <div className="repartidor-map-note">
                  ⏳ Cargando coordenadas guardadas en la base de datos...
                </div>
              )}
            </div>
          </>
        )}

        {/* 📍 LISTADO DE LOCALES */}
        <section className="repartidor-subbox">
          <h3 className="repartidor-subbox__title">📍 Datos de entrega y locales</h3>
          <p className="repartidor-info-row">
            <strong>Dirección del cliente:</strong> {pedido.direccion_entrega || pedido.direccion_cliente || 'No informada'}
          </p>

          {!esPedidoEntregado && pedido.telefono_cliente && (
            <div className="repartidor-contact" style={{ margin: '12px 0' }}>
              <a
                href={`tel:${pedido.telefono_cliente}`}
                className="repartidor-btn repartidor-btn--info-soft repartidor-btn--sm"
              >
                📞 Llamar Cliente
              </a>
              <a
                href={`https://wa.me/${formatearTelefonoWA(pedido.telefono_cliente)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="repartidor-btn repartidor-btn--success-soft repartidor-btn--sm"
              >
                💬 WhatsApp Cliente
              </a>
            </div>
          )}

          <h4 style={{ margin: '12px 0 8px', color: 'var(--sd-rep-navy)' }}>
            🏪 Locales involucrados ({localesInvolucrados.length}):
          </h4>

          {localesInvolucrados.length > 0 ? (
            <div className="repartidor-stops-list">
              {localesInvolucrados.map((local, index) => {
                const esSiguienteEnRuta = primerLocalPendiente?.id === local.id;
                const habilitadoPorProximidad = estaEnCamino && local.estaCerca && esSiguienteEnRuta && !local.todosRechazados;

                let itemClass = 'repartidor-stop-item';
                if (local.todosRechazados) {
                  itemClass += ' repartidor-stop-item--rejected';
                } else if (local.retirado) {
                  itemClass += ' repartidor-stop-item--retired';
                } else if (esSiguienteEnRuta) {
                  itemClass += ' repartidor-stop-item--next';
                }

                return (
                  <div key={local.id || index} className={itemClass}>
                    <div className="repartidor-stop-head">
                      <div>
                        <span className="repartidor-stop-head__num">Parada {index + 1} de {localesInvolucrados.length}</span>
                        <strong>{local.nombre}</strong>
                      </div>
                      {local.todosRechazados ? (
                        <span className="repartidor-badge repartidor-badge--error">
                          ❌ Rechazado
                        </span>
                      ) : local.retirado ? (
                        <span className="repartidor-badge repartidor-badge--success">
                          ✅ Retirado
                        </span>
                      ) : (
                        <span className="repartidor-badge" style={{ backgroundColor: esSiguienteEnRuta ? 'var(--sd-rep-info-soft)' : 'var(--sd-rep-surface-soft)', color: esSiguienteEnRuta ? 'var(--sd-rep-info)' : 'var(--sd-rep-muted)' }}>
                          {esSiguienteEnRuta ? '📍 Siguiente parada' : '⏳ En espera'}
                        </span>
                      )}
                    </div>

                    {local.direccion && (
                      <p className="repartidor-muted" style={{ fontSize: '0.875rem' }}>
                        <strong>Dirección:</strong> {local.direccion}
                      </p>
                    )}

                    <div className="repartidor-stop-foot">
                      <div className="repartidor-contact">
                        {local.telefono ? (
                          <>
                            <a
                              href={`tel:${local.telefono}`}
                              className="repartidor-btn repartidor-btn--info-soft repartidor-btn--sm"
                            >
                              📞 Llamar
                            </a>
                            <a
                              href={`https://wa.me/${formatearTelefonoWA(local.telefono)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="repartidor-btn repartidor-btn--success-soft repartidor-btn--sm"
                            >
                              💬 WhatsApp
                            </a>
                          </>
                        ) : (
                          <span className="repartidor-muted" style={{ fontSize: '0.8125rem' }}>
                            Sin teléfono
                          </span>
                        )}
                      </div>

                      <div className="repartidor-stop-foot__action">
                        {local.todosRechazados ? (
                          <span className="repartidor-hint repartidor-hint--error">
                            🚫 Omitido del recorrido
                          </span>
                        ) : !local.retirado ? (
                          <>
                            <button
                              onClick={() => setLocalAConfirmar(local)}
                              disabled={!habilitadoPorProximidad || accionProcesando === `retiro_${local.id}`}
                              className={`repartidor-btn repartidor-btn--sm ${!habilitadoPorProximidad ? '' : 'repartidor-btn--primary'}`}
                              style={{ backgroundColor: !habilitadoPorProximidad ? '#adb5bd' : undefined }}
                            >
                              {accionProcesando === `retiro_${local.id}`
                                ? '⏳ Confirmando...'
                                : !estaEnCamino
                                  ? 'Iniciá el recorrido primero'
                                  : !esSiguienteEnRuta
                                    ? 'Espere turno de ruta'
                                    : !local.estaCerca
                                      ? `Debes estar a menos de 100m`
                                      : '📦 Confirmar Retiro'}
                            </button>

                            {!estaEnCamino && (
                              <span className="repartidor-hint">
                                📍 Iniciá el recorrido para confirmar retiros
                              </span>
                            )}

                            {estaEnCamino && !esSiguienteEnRuta && (
                              <span className="repartidor-hint repartidor-hint--error">
                                Debe completar paradas anteriores
                              </span>
                            )}

                            {estaEnCamino && esSiguienteEnRuta && !local.estaCerca && (
                              <span className="repartidor-hint">
                                📍 A menos de 100m ({local.distanciaMetros ?? '---'}m actual)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="repartidor-hint" style={{ color: 'var(--sd-rep-success)' }}>
                            ✓ Retirado exitosamente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="repartidor-muted" style={{ margin: 0 }}>No hay información de locales disponibles.</p>
          )}
        </section>

        {enEsperadeRetiro && (
          <div className="repartidor-alert repartidor-alert--warning">
            🛑 Simulación pausada: Llegaste al local. Debes confirmar el retiro de los productos para continuar.
          </div>
        )}

        {!esPedidoEntregado && (
          <section className="repartidor-actions">
            {(puedeIniciarRecorrido || puedeLiberar) && (
              <div className="repartidor-stack">
                {puedeIniciarRecorrido && (
                  <button
                    onClick={handleSimularRecorrido}
                    disabled={accionProcesando !== ''}
                    className="repartidor-btn repartidor-btn--primary repartidor-btn--lg repartidor-btn--block"
                  >
                    {accionProcesando === 'recorrido' ? '⏳ Iniciando recorrido...' : '🚴 Iniciar recorrido simulado'}
                  </button>
                )}

                {puedeLiberar && (
                  <button
                    onClick={handleLiberarPedido}
                    disabled={accionProcesando !== ''}
                    className="repartidor-btn repartidor-btn--danger-soft repartidor-btn--block"
                  >
                    {accionProcesando === 'liberar' ? '⏳ Liberando...' : '❌ Rechazar / Liberar viaje'}
                  </button>
                )}
              </div>
            )}

            {puedeEntregar && (
              <div className="repartidor-subbox" style={{ background: 'var(--sd-rep-success-soft)', borderColor: 'var(--sd-rep-success-line)' }}>
                <h3 className="repartidor-subbox__title" style={{ color: 'var(--sd-rep-success)' }}>✅ Confirmar entrega</h3>
                <p className="repartidor-muted">Ingresá el código OTP proporcionado por el cliente.</p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Código OTP"
                  maxLength={8}
                  disabled={accionProcesando !== ''}
                  className="repartidor-input repartidor-otp"
                />
                <button
                  onClick={handleEntregar}
                  disabled={accionProcesando !== ''}
                  className="repartidor-btn repartidor-btn--success repartidor-btn--lg repartidor-btn--block"
                >
                  {accionProcesando === 'entrega' ? '⏳ Confirmando entrega...' : '✅ Entregar pedido'}
                </button>
              </div>
            )}

            {estadoGlobalId === 3 && (
              <div className="repartidor-alert repartidor-alert--success" style={{ justifyContent: 'center' }}>
                ✅ Este pedido ya fue entregado.
              </div>
            )}
          </section>
        )}

        {/* 💳 SECCIÓN DE INFORMACIÓN DE PAGO, COBRO Y LIQUIDACIÓN */}
        <section className="repartidor-finance-box">
          <h3 style={{ marginTop: 0, color: 'var(--sd-rep-navy)' }}>
            📦 Productos y resumen del viaje
          </h3>

          <div className="repartidor-finance-grid">
            <div className="repartidor-finance-item repartidor-finance-item--text">
              <span>Método de Pago</span>
              <p>{pedido.metodo_pago || (esPagoEfectivo ? 'Efectivo contra entrega' : 'Pago Digital')}</p>
            </div>

            <div className="repartidor-finance-item repartidor-finance-item--highlight">
              <span>Tu parte del envío</span>
              <p>${formatoMonto(gananciaRepartidor)}</p>
            </div>

            <div className="repartidor-finance-item">
              <span>Costo total del envío</span>
              <p>${formatoMonto(costoEnvio)}</p>
            </div>

            <div className="repartidor-finance-item">
              <span>Total del pedido</span>
              <p>${formatoMonto(totalOrdenCalculado)}</p>
            </div>
          </div>

          <div className="repartidor-lines">
            <div className="repartidor-lines__head">
              <h3>Productos por local</h3>
              <span>{pedido.productos?.length || 0} productos</span>
            </div>

            {localesInvolucrados.length ? localesInvolucrados.map((local) => {
              const liquidacion = pedido.liquidacion_locales?.find(
                (item) => Number(item.IDlocal) === Number(local.id)
              );
              const importeBruto = Number(liquidacion?.importe_bruto ?? local.items.reduce((total, producto) => {
                const estado = Number(producto.IDestado_detalle || producto.IDestado_item || producto.IDestado);
                return estado === 6 ? total : total + Number(producto.precio_unitario || 0) * Number(producto.cantidad || 0);
              }, 0));

              return (
                <div key={`productos-local-${local.id}`} className="repartidor-line-group">
                  <div className="repartidor-line-group__head">
                    <span>
                      <strong>{local.nombre || `Local #${local.id}`}</strong>
                      <small>{local.items.length} ítems</small>
                    </span>
                    <strong>${formatoMonto(importeBruto)}</strong>
                  </div>
                  <div className="repartidor-line-items">
                    {local.items.map((producto, index) => {
                      const estado = Number(producto.IDestado_detalle || producto.IDestado_item || producto.IDestado);
                      const esCancelado = estado === 6;
                      const importeItem = Number(producto.precio_unitario || 0) * Number(producto.cantidad || 0);

                      return (
                        <div key={producto.IDdetalle || `${local.id}-${index}`} className={`repartidor-line-item ${esCancelado ? 'is-cancelled' : ''}`}>
                          <span>
                            <strong>{producto.cantidad}x {producto.producto}</strong>
                            <small>{producto.estado_detalle || (esCancelado ? 'Cancelado / Rechazado' : 'En proceso')}</small>
                          </span>
                          {esPedidoEntregado && <span>${formatoMonto(importeItem)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }) : <p className="repartidor-muted">No hay productos asociados.</p>}
          </div>

          <div className="repartidor-platform-row">
            <span>Parte del envío para la plataforma</span>
            <strong>${formatoMonto(Math.max(0, costoEnvio - gananciaRepartidor))}</strong>
          </div>

          {esPedidoEntregado && esPagoEfectivo && (
            <div className="repartidor-rendir">
              <div className="repartidor-rendir__row">
                <strong>Efectivo a rendir</strong>
                <strong>${formatoMonto(montoARendir)}</strong>
              </div>
              <details>
                <summary>Ver composición del efectivo a rendir</summary>
                <div>
                  {pedido.liquidacion_locales?.map((local) => (
                    <div key={`rendir-${local.IDlocal}`}>
                      <span>Productos para {local.nombre || `Local #${local.IDlocal}`}</span>
                      <span>${formatoMonto(local.importe_bruto)}</span>
                    </div>
                  ))}
                  <div>
                    <span>Retención de plataforma del envío</span>
                    <span>${formatoMonto(Math.max(0, costoEnvio - gananciaRepartidor))}</span>
                  </div>
                </div>
              </details>
            </div>
          )}

          {!esPedidoEntregado && (esPagoEfectivo ? (
            <div className="repartidor-alert repartidor-alert--warning" style={{ margin: 0 }}>
              💵 Cobro en efectivo: cobrar al cliente el total indicado arriba.
            </div>
          ) : (
            <div className="repartidor-alert repartidor-alert--success" style={{ margin: 0 }}>
              ✅ <strong>PAGO DIGITAL REGISTRADO:</strong> El cliente ya abonó electrónicamente. <strong>NO cobres dinero al cliente.</strong> Tu ganancia se acreditará automáticamente.
            </div>
          ))}
        </section>

        {/* MODAL CONFIRMACIÓN RETIRO */}
        {!esPedidoEntregado && localAConfirmar && (
          <div className="repartidor-modal-overlay">
            <div className="repartidor-modal-content repartidor-modal-content--sm">
              <div className="repartidor-modal-head">
                <h2>📦 Confirmar Retiro</h2>
                <button onClick={() => setLocalAConfirmar(null)}>✕</button>
              </div>
              <p>¿Confirmás que ya retiraste todos los paquetes en <strong>{localAConfirmar.nombre}</strong>?</p>

              {localAConfirmar.items && localAConfirmar.items.length > 0 && (
                <ul className="repartidor-retiro-items">
                  {localAConfirmar.items.map((it, idx) => (
                    <li key={it.IDdetalle || idx}>
                      {it.cantidad}x {it.producto}
                    </li>
                  ))}
                </ul>
              )}

              <div className="repartidor-modal-foot">
                <button onClick={() => setLocalAConfirmar(null)} disabled={accionProcesando !== ''} className="repartidor-btn repartidor-btn--outline repartidor-btn--grow">Cancelar</button>
                <button onClick={handleEjecutarConfirmacionRetiro} disabled={accionProcesando !== ''} className="repartidor-btn repartidor-btn--primary repartidor-btn--grow">
                  {accionProcesando === `retiro_${localAConfirmar.id}` ? '⏳ Confirmando...' : '✅ Confirmar Retiro'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🟢 MODAL ESTÉTICO DE AVISOS / ALERTAS */}
      {modalAviso && (
        <div className="repartidor-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="repartidor-modal-content repartidor-modal-content--sm">
            <div className="repartidor-aviso-box">
              <div className={`repartidor-aviso-icon ${modalAviso.titulo.includes('✅') ? 'repartidor-aviso-icon--success' : 'repartidor-aviso-icon--error'}`}>
                {modalAviso.titulo.includes('✅') ? '✓' : '⚠️'}
              </div>
              <h3>{modalAviso.titulo}</h3>
              <p>{modalAviso.mensaje}</p>
            </div>
            <div className="repartidor-modal-foot" style={{ marginTop: '24px' }}>
              <button
                onClick={() => {
                  const cb = modalAviso.callback;
                  setModalAviso(null);
                  if (cb) cb();
                }}
                className="repartidor-btn repartidor-btn--primary repartidor-btn--block"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL ESTÉTICO DE CONFIRMACIÓN */}
      {modalConfirmacion && (
        <div className="repartidor-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="repartidor-modal-content repartidor-modal-content--sm">
            <div className="repartidor-aviso-box">
              <div className="repartidor-aviso-icon repartidor-aviso-icon--warning">⚠️</div>
              <h3>{modalConfirmacion.titulo}</h3>
              <p>{modalConfirmacion.mensaje}</p>
            </div>
            <div className="repartidor-modal-foot">
              <button
                onClick={() => setModalConfirmacion(null)}
                className="repartidor-btn repartidor-btn--outline repartidor-btn--grow"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmacion.onConfirm}
                className="repartidor-btn repartidor-btn--danger repartidor-btn--grow"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};