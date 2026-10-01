import { useEffect, useState, useMemo, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPedidoAsignado,
  simularRecorridoPedido,
  entregarPedido,
  liberarPedidoRepartidor,
  confirmarRetiroLocal
} from '../../api/repartidorService';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

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

  // 🗺️ Estado para almacenar los puntos por calle obtenidos de OSRM
  const [rutaCalles, setRutaCalles] = useState([]);

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
    const intervalo = setInterval(actualizarPedido, 5000);
    return () => clearInterval(intervalo);
  }, [ordenId]);

  const handleSimularRecorrido = async () => {
    if (!pedido?.IDrepartidor) {
      alert('No se encontró el repartidor asignado.');
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
      alert(
        err.response?.data?.error ||
        'No se pudo iniciar la simulación del recorrido.'
      );
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
      alert(
        err.response?.data?.error ||
        `No se pudo confirmar el retiro en ${localAConfirmar.nombre}.`
      );
    } finally {
      setAccionProcesando('');
    }
  };

  const handleEntregar = async () => {
    if (!otp.trim()) {
      alert('Ingresá el código OTP que te proporciona el cliente.');
      return;
    }

    try {
      setAccionProcesando('entrega');
      await entregarPedido(Number(ordenId), otp.trim());
      alert('Pedido entregado correctamente.');
      navigate('/repartidor/inicio');
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'No se pudo confirmar la entrega.'
      );
    } finally {
      setAccionProcesando('');
    }
  };

  const handleLiberarPedido = async () => {
    const confirmacion = window.confirm(
      '¿Estás seguro de que deseas rechazar/liberar este pedido? El pedido volverá a la lista de disponibles para otros repartidores.'
    );

    if (!confirmacion) return;

    try {
      setAccionProcesando('liberar');
      await liberarPedidoRepartidor(Number(ordenId));
      alert('Pedido liberado correctamente. Volviendo al listado.');
      navigate('/repartidor/inicio');
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'No se pudo liberar el pedido.'
      );
    } finally {
      setAccionProcesando('');
    }
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
      !esRechazado && (
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
    const listaRuta = pedido?.localesRuta || pedido?.localesOrdenados || [];
    if (!Array.isArray(listaRuta)) return -1;
    return listaRuta.findIndex(
      (l) => Number(l.IDlocal ?? l.id ?? l.localId) === Number(idLocal)
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

    return 0;
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

  // 🛑 Omitir locales 100% rechazados o retirados para determinar la siguiente parada
  const primerLocalPendiente = localesInvolucrados.find((l) => !l.retirado && !l.todosRechazados);
  const todosLocalesListos = localesInvolucrados.length === 0 || localesInvolucrados.every((l) => l.retirado || l.todosRechazados);

  // 🎯 Coordenadas del destino actual (Local pendiente o Cliente)
  const destinoLat = primerLocalPendiente?.latitud != null
    ? Number(primerLocalPendiente.latitud)
    : (todosLocalesListos && pedido?.latitud_entrega != null ? Number(pedido.latitud_entrega) : null);

  const destinoLng = primerLocalPendiente?.longitud != null
    ? Number(primerLocalPendiente.longitud)
    : (todosLocalesListos && pedido?.longitud_entrega != null ? Number(pedido.longitud_entrega) : null);

  // 🆔 Identificador de la etapa actual (Cambia solo al pasar de un local a otro o al cliente)
  const etapaId = primerLocalPendiente?.id ?? (todosLocalesListos ? 'CLIENTE' : null);

  // 🛣️ Puntos directo/fallback para encuadre y respaldo de la Polyline
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

  // ✂️ Recortar la ruta para que solo se dibuje desde la posición actual
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
    if (repLat == null || repLng == null || destinoLat == null || destinoLng == null || !etapaId) {
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
  }, [etapaId, destinoLat, destinoLng]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        ⏳ Cargando información del pedido...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#e03131' }}>
        {error}
      </div>
    );
  }

  if (!pedido) {
    return (
      <div style={{ padding: '2rem' }}>
        Pedido no encontrado.
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

  // 💳 Banderas y variables de Estado de Pago
  const esPagoEfectivo = Number(pedido.IDmetodo_pago) === 1 || String(pedido.metodo_pago).toLowerCase().includes('efectivo');
  const pagoAprobado = Number(pedido.IDestado_pago) === 2 || String(pedido.estado_pago).toLowerCase().includes('aprobado');

  // Definir una constante auxiliar arriba del return si se prefiere, o de forma inline:
  const subtotalPedido = Number(
    pedido.subtotal_productos ?? pedido.subtotal ?? pedido.precio ?? 0
  );
  const costoEnvio = Number(pedido.costo_envio ?? 0);
  const totalOrdenCalculado = Number(
    pedido.total_orden ?? pedido.total ?? subtotalPedido + costoEnvio
  );

  const gananciaLocal = Number(
    pedido.ganancia_local_total ?? subtotalPedido * 0.9
  );
  const gananciaRepartidor = Number(
    pedido.ganancia_repartidor ?? costoEnvio * 0.85
  );
  const retencionPlataforma =
    (subtotalPedido - gananciaLocal) + (costoEnvio - gananciaRepartidor);

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
      <button
        onClick={() => navigate('/repartidor/inicio')}
        style={{ marginBottom: '1rem', padding: '0.6rem 1rem', cursor: 'pointer' }}
      >
        ← Volver a mis pedidos
      </button>

      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ margin: 0, color: '#6c757d' }}>Detalle del pedido</p>
            <h2 style={{ margin: '0.3rem 0' }}>Pedido #{pedido.IDorden}</h2>
          </div>

          <span
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '20px',
              backgroundColor: estadoGlobalId === 5 ? '#ffe8cc' : '#d0ebff',
              color: estadoGlobalId === 5 ? '#d9480f' : '#1864ab',
              fontWeight: 'bold'
            }}
          >
            {pedido.estado_orden || 'Sin estado'}
          </span>
        </div>

        {/* 🗺️ MAPA INTERACTIVO PROGRESIVO POR PARADAS */}
        <section style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <h3>🗺️ Navegación por Paradas en Tiempo Real</h3>

          {repLat != null && repLng != null ? (
            <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem' }}>
              <MapContainer center={[repLat, repLng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <AjustarVistaMapa puntos={puntosMapa} />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
            <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', color: '#856404', textAlign: 'center' }}>
              ⏳ Cargando coordenadas guardadas en la base de datos...
            </div>
          )}
        </section>



        {/* 📍 LISTADO DE LOCALES */}
        <section style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>📍 Datos de entrega y locales</h3>
          <p>
            <strong>Dirección del cliente:</strong> {pedido.direccion_entrega || pedido.direccion_cliente || 'No informada'}
          </p>

          {pedido.telefono_cliente && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <a
                href={`tel:${pedido.telefono_cliente}`}
                style={{
                  padding: '0.5rem 0.8rem',
                  backgroundColor: '#22b8cf',
                  color: '#fff',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}
              >
                📞 Llamar Cliente
              </a>
              <a
                href={`https://wa.me/${formatearTelefonoWA(pedido.telefono_cliente)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 0.8rem',
                  backgroundColor: '#2b8a3e',
                  color: '#fff',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}
              >
                💬 WhatsApp Cliente
              </a>
            </div>
          )}

          <h4 style={{ margin: '1rem 0 0.5rem' }}>
            🏪 Locales involucrados ({localesInvolucrados.length}):
          </h4>

          {localesInvolucrados.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {localesInvolucrados.map((local, index) => {
                const esSiguienteEnRuta = primerLocalPendiente?.id === local.id;
                const habilitadoPorProximidad = estaEnCamino && local.estaCerca && esSiguienteEnRuta && !local.todosRechazados;

                let cardBg = '#f1f3f5';
                let cardBorder = '1px solid #dee2e6';

                if (local.todosRechazados) {
                  cardBg = '#ffe3e3';
                  cardBorder = '1px solid #ffc9c9';
                } else if (local.retirado) {
                  cardBg = '#e6fcf5';
                  cardBorder = '1px solid #20c997';
                } else if (esSiguienteEnRuta) {
                  cardBg = '#fff';
                  cardBorder = '2px solid #1c7ed6';
                }

                return (
                  <div
                    key={local.id || index}
                    style={{
                      padding: '0.8rem',
                      backgroundColor: cardBg,
                      border: cardBorder,
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <p style={{ margin: 0 }}>
                        <span style={{ fontWeight: 'bold', color: '#1c7ed6', marginRight: '0.5rem' }}>
                          Parada {index + 1} de {localesInvolucrados.length}:
                        </span>
                        <strong>{local.nombre}</strong>
                      </p>
                      {local.todosRechazados ? (
                        <span style={{ color: '#c92a2a', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ❌ Productos Rechazados (Parada Omitida)
                        </span>
                      ) : local.retirado ? (
                        <span style={{ color: '#0ca678', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ✅ Paquete Retirado
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: esSiguienteEnRuta ? '#1c7ed6' : '#868e96', fontWeight: 'bold' }}>
                          {esSiguienteEnRuta ? '📍 Siguiente parada' : '⏳ En espera de turno'}
                        </span>
                      )}
                    </div>

                    {local.direccion && (
                      <p style={{ margin: '0.3rem 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                        <strong>Dirección:</strong> {local.direccion}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
                      {local.telefono ? (
                        <>
                          <a
                            href={`tel:${local.telefono}`}
                            style={{
                              padding: '0.4rem 0.7rem',
                              backgroundColor: '#22b8cf',
                              color: '#fff',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}
                          >
                            📞 Llamar al Local
                          </a>
                          <a
                            href={`https://wa.me/${formatearTelefonoWA(local.telefono)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '0.4rem 0.7rem',
                              backgroundColor: '#2b8a3e',
                              color: '#fff',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}
                          >
                            💬 WhatsApp Local
                          </a>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#888' }}>
                          Sin teléfono registrado
                        </span>
                      )}

                      {local.todosRechazados ? (
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#c92a2a', fontWeight: 'bold' }}>
                          🚫 Omitido del recorrido
                        </span>
                      ) : !local.retirado ? (
                        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                          <button
                            onClick={() => setLocalAConfirmar(local)}
                            disabled={!habilitadoPorProximidad || accionProcesando === `retiro_${local.id}`}
                            style={{
                              padding: '0.4rem 0.8rem',
                              backgroundColor: !habilitadoPorProximidad ? '#adb5bd' : accionProcesando === `retiro_${local.id}` ? '#868e96' : '#fd7e14',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              cursor: !habilitadoPorProximidad || accionProcesando === `retiro_${local.id}` ? 'not-allowed' : 'pointer'
                            }}
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
                            <span style={{ fontSize: '0.75rem', color: '#e67700', fontWeight: 'bold' }}>
                              📍 Iniciá el recorrido para poder confirmar retiros
                            </span>
                          )}

                          {estaEnCamino && !esSiguienteEnRuta && (
                            <span style={{ fontSize: '0.75rem', color: '#fa5252' }}>
                              Debe completar las paradas anteriores
                            </span>
                          )}

                          {estaEnCamino && esSiguienteEnRuta && !local.estaCerca && (
                            <span style={{ fontSize: '0.75rem', color: '#e67700', fontWeight: 'bold' }}>
                              📍 Debes estar en el local para confirmar ({local.distanciaMetros ?? '---'}m de distancia)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#0ca678', fontWeight: 'bold' }}>
                          ✓ Retirado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0 }}>No hay información de locales disponibles.</p>
          )}
        </section>



        {enEsperadeRetiro && (
          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffe8cc', borderRadius: '8px', color: '#856404', marginBottom: '1.5rem', fontWeight: 'bold' }}>
            🛑 Simulación pausada: Llegaste al local. Debes confirmar el retiro de los productos para continuar con el recorrido.
          </div>
        )}



        {/* ACCIONES Y ENTREGA OTP */}
        <section style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          {(puedeIniciarRecorrido || puedeLiberar) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {puedeIniciarRecorrido && (
                <button
                  onClick={handleSimularRecorrido}
                  disabled={accionProcesando !== ''}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    backgroundColor: accionProcesando === 'recorrido' ? '#868e96' : '#1c7ed6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: accionProcesando !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {accionProcesando === 'recorrido' ? '⏳ Iniciando recorrido...' : '🚴 Iniciar recorrido simulado'}
                </button>
              )}

              {puedeLiberar && (
                <button
                  onClick={handleLiberarPedido}
                  disabled={accionProcesando !== ''}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    backgroundColor: accionProcesando === 'liberar' ? '#868e96' : '#e03131',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: accionProcesando !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {accionProcesando === 'liberar' ? '⏳ Liberando...' : '❌ Rechazar / Liberar viaje'}
                </button>
              )}
            </div>
          )}

          {puedeEntregar && (
            <div>
              <h3>✅ Confirmar entrega</h3>
              <p style={{ color: '#666' }}>Ingresá el código OTP proporcionado por el cliente.</p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Código OTP"
                maxLength={8}
                disabled={accionProcesando !== ''}
                style={{ width: '100%', padding: '0.8rem', border: '1px solid #ced4da', borderRadius: '8px', marginBottom: '0.8rem', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleEntregar}
                disabled={accionProcesando !== ''}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  backgroundColor: accionProcesando === 'entrega' ? '#868e96' : '#2b8a3e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: accionProcesando !== '' ? 'not-allowed' : 'pointer'
                }}
              >
                {accionProcesando === 'entrega' ? '⏳ Confirmando entrega...' : '✅ Entregar pedido'}
              </button>
            </div>
          )}

          {estadoGlobalId === 3 && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#d4edda',
                color: '#155724',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              ✅ Este pedido ya fue entregado.
            </div>
          )}
        </section>



        {/* 📦 SECCIÓN PRODUCTOS */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3>📦 Productos del pedido</h3>

          {pedido.productos?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pedido.productos.map((producto) => {
                const estadoDetalleId = Number(producto.IDestado_detalle || producto.IDestado_item || producto.IDestado);
                const esCancelado = estadoDetalleId === 6;

                return (
                  <div
                    key={producto.IDdetalle}
                    style={{
                      padding: '0.8rem',
                      backgroundColor: esCancelado ? '#fff5f5' : '#f8f9fa',
                      borderRadius: '8px',
                      border: esCancelado ? '1px solid #ffa8a8' : '1px solid #dee2e6',
                      opacity: esCancelado ? 0.75 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ textDecoration: esCancelado ? 'line-through' : 'none' }}>
                        {producto.cantidad}x {producto.producto}
                      </strong>

                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          color: esCancelado ? '#e03131' : '#2b8a3e',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          backgroundColor: esCancelado ? '#ffe3e3' : '#e6fcf5'
                        }}
                      >
                        {producto.estado_detalle || (esCancelado ? 'Cancelado / Rechazado' : 'En proceso')}
                      </span>
                    </div>

                    <p style={{ margin: '0.3rem 0', color: '#555', fontSize: '0.9rem' }}>
                      Local: {producto.local || 'No informado'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No hay productos asociados.</p>
          )}
        </section>



        {/* 💳 SECCIÓN DE INFORMACIÓN DE PAGO, COBRO Y LIQUIDACIÓN */}
        <section
          style={{
            backgroundColor: esPagoEfectivo ? '#fff9db' : '#e7f5ff',
            border: esPagoEfectivo ? '1px solid #ffe066' : '1px solid #a5d8ff',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: esPagoEfectivo ? '#f59f00' : '#1c7ed6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            💳 Resumen Financiero y Cobro
          </h3>

          {/* Resumen principal de montos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.2rem'
            }}
          >
            <div>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Método de Pago:</span>
              <p style={{ margin: '0.2rem 0', fontWeight: 'bold', fontSize: '1rem' }}>
                {pedido.metodo_pago || (esPagoEfectivo ? 'Efectivo contra entrega' : 'Pago Digital')}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Ganancia Envío (Para ti):</span>
              <p style={{ margin: '0.2rem 0', fontWeight: 'bold', fontSize: '1.2rem', color: '#2b8a3e' }}>
                ${Number(pedido.ganancia_repartidor || (pedido.costo_envio * 0.85) || 0).toLocaleString('es-AR')}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Costo de Envío Total:</span>
              <p style={{ margin: '0.2rem 0', fontWeight: 'bold', fontSize: '1.1rem', color: '#1c7ed6' }}>
                ${Number(pedido.costo_envio || 0).toLocaleString('es-AR')}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Total de la Orden:</span>
              <p style={{ margin: '0.2rem 0', fontWeight: 'bold', fontSize: '1.2rem', color: '#333' }}>
                ${totalOrdenCalculado.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          {/* 💵 DESGLOSE DE DISTRIBUCIÓN DE EFECTIVO O PAGO DIGITAL */}
          {esPagoEfectivo ? (
            <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #ffe066' }}>
              <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', color: '#d9480f', fontSize: '1rem' }}>
                💵 Debes cobrar en mano al cliente: <u>${totalOrdenCalculado.toLocaleString('es-AR')}</u>
              </p>

              <div style={{ fontSize: '0.9rem', color: '#444', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '0.3rem' }}>
                  <span>🏪 Entregar al Local (Comida):</span>
                  <strong>
                    ${Number(
                      pedido.ganancia_local_total ??
                      pedido.subtotal ??
                      pedido.precio ??
                      0
                    ).toLocaleString('es-AR')}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '0.3rem' }}>
                  <span>📱 Retención / Ganancia App:</span>
                  <strong>${(Number(pedido.costo_envio || 0) - Number(pedido.ganancia_repartidor || (pedido.costo_envio * 0.85) || 0)).toLocaleString('es-AR')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b8a3e', fontWeight: 'bold', paddingTop: '0.2rem' }}>
                  <span>🚴 Tu ganancia neta (conservas):</span>
                  <span>${Number(pedido.ganancia_repartidor || (pedido.costo_envio * 0.85) || 0).toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.8rem', backgroundColor: '#d3f9d8', border: '1px solid #8ce99a', borderRadius: '6px', color: '#2b8a3e', fontSize: '0.9rem' }}>
              ✅ <strong>PAGO DIGITAL REGISTRADO:</strong> El cliente ya abonó electrónicamente.
              <br />
              <strong>NO cobres dinero al cliente.</strong> Tu ganancia por este envío (${Number(pedido.ganancia_repartidor || (pedido.costo_envio * 0.85) || 0).toLocaleString('es-AR')}) se acreditará automáticamente en tu billetera/saldo de la App.
            </div>
          )}
        </section>



        {/* MODAL CONFIRMACIÓN RETIRO */}
        {localAConfirmar && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#1c7ed6' }}>📦 Confirmar Retiro de Productos</h3>
              <p>¿Confirmás que ya retiraste todos los paquetes en <strong>{localAConfirmar.nombre}</strong>?</p>

              {localAConfirmar.items && localAConfirmar.items.length > 0 && (
                <div style={{ backgroundColor: '#f8f9fa', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <strong>Productos a retirar:</strong>
                  <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem' }}>
                    {localAConfirmar.items.map((it, idx) => (
                      <li key={it.IDdetalle || idx}>
                        {it.cantidad}x {it.producto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button onClick={() => setLocalAConfirmar(null)} disabled={accionProcesando !== ''} style={{ padding: '0.6rem 1rem', backgroundColor: '#e9ecef', color: '#495057', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                <button onClick={handleEjecutarConfirmacionRetiro} disabled={accionProcesando !== ''} style={{ padding: '0.6rem 1rem', backgroundColor: '#fd7e14', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: accionProcesando !== '' ? 'not-allowed' : 'pointer' }}>
                  {accionProcesando === `retiro_${localAConfirmar.id}` ? '⏳ Confirmando...' : '✅ Confirmar Retiro'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};