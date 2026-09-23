import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPedidoAsignado,
  simularRecorridoPedido,
  entregarPedido,
  liberarPedidoRepartidor,
  confirmarRetiroLocal,
  actualizarUbicacionRepartidor
} from '../../api/repartidorService';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
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

const iconoLocal = (esSiguiente, retirado) => {
  let bgColor = '#868e96'; // Gris = en espera

  if (retirado) {
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
      ">
        🏪
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

export const DetallePedidoRepartidor = () => {
  const { ordenId } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [accionProcesando, setAccionProcesando] = useState('');
  const [localAConfirmar, setLocalAConfirmar] = useState(null);

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
    // Disminuimos a 1000ms (1 segundo) para reflejar los metros en tiempo real de la simulación
    const intervalo = setInterval(actualizarPedido, 1000);
    return () => clearInterval(intervalo);
  }, [ordenId]);

  // 📡 Envío de geolocalización GPS real
  useEffect(() => {
    const enviarUbicacionGPS = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            await actualizarUbicacionRepartidor(lat, lng);
          } catch (err) {
            console.error('Error al actualizar la ubicación GPS:', err);
          }
        },
        (error) => {
          console.warn('Advertencia de geolocalización:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    enviarUbicacionGPS();
    const intervaloGPS = setInterval(enviarUbicacionGPS, 7000);
    return () => clearInterval(intervaloGPS);
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

      // 1. Petición al backend
      await confirmarRetiroLocal(Number(ordenId), {
        IDlocal: localAConfirmar.id
      });

      // 2. Cerrar el modal DE INMEDIATO para no interrumpir el mapa ni pausar la vista
      const localNombre = localAConfirmar.nombre;
      setLocalAConfirmar(null);

      // 3. Recargar el pedido en segundo plano para reflejar el retiro en el mapa de inmediato
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

  // 1. Agrupar productos por local
  const localesMap = new Map();

  pedido?.productos?.forEach((p) => {
    if (!p.local) return;
    const idLocal = p.IDlocal || p.local;

    const localRutaInfo = pedido?.localesRuta?.find((l) => Number(l.IDlocal) === Number(idLocal));

    // Obtener la sensibilidad más alta presente en el local
    const sensibilidadProd = Number(localRutaInfo?.max_sensibilidad ?? p.nivel_sensibilidad ?? 1);

    const latLocal = p.latitud_local != null ? Number(p.latitud_local) : (localRutaInfo?.latitud ? Number(localRutaInfo.latitud) : null);
    const lngLocal = p.longitud_local != null ? Number(p.longitud_local) : (localRutaInfo?.longitud ? Number(localRutaInfo.longitud) : null);

    const yaRetirado =
      localRutaInfo?.retirado === 1 ||
      localRutaInfo?.retirado === true ||
      pedido?.retiros_realizados?.includes(idLocal) ||
      p.retirado === true;

    if (!localesMap.has(idLocal)) {
      localesMap.set(idLocal, {
        id: Number(idLocal),
        nombre: p.local,
        telefono: p.telefono_local,
        direccion: p.direccion_local,
        latitud: latLocal,
        longitud: lngLocal,
        retirado: Boolean(yaRetirado),
        maxSensibilidad: sensibilidadProd,
        items: []
      });
    } else {
      // Si el local tiene más de un producto, aseguramos tomar la MAYOR sensibilidad
      const localExistente = localesMap.get(idLocal);
      if (sensibilidadProd > localExistente.maxSensibilidad) {
        localExistente.maxSensibilidad = sensibilidadProd;
      }
    }

    localesMap.get(idLocal).items.push(p);
  });

  // 2. 🎯 ORDENAMIENTO ESTRICTO POR SENSIBILIDAD PARA EL MAPA Y NAVEGACIÓN
  const localesOrdenados = Array.from(localesMap.values()).sort((a, b) => {
    // Criterio 1: Los ya retirados van al final de la secuencia
    if (a.retirado !== b.retirado) {
      return a.retirado ? 1 : -1;
    }
    // Criterio 2: Menor sensibilidad primero (Nivel 1: Bebidas/Panadería -> Nivel 4: Helados)
    if (a.maxSensibilidad !== b.maxSensibilidad) {
      return a.maxSensibilidad - b.maxSensibilidad;
    }
    // Criterio 3: Desempate por ID de local
    return a.id - b.id;
  });

  // 1. Coordenadas en tiempo real del repartidor
  const repLat = pedido?.repartidor_latitud != null ? Number(pedido.repartidor_latitud) : null;
  const repLng = pedido?.repartidor_longitud != null ? Number(pedido.repartidor_longitud) : null;

  // 2. Mapeo con recálculo dinámico de la distancia a cada local
  const localesInvolucrados = localesOrdenados.map((local) => {
    const distanciaMetros = (repLat != null && repLng != null && local.latitud != null && local.longitud != null)
      ? Math.round(calcularDistanciaMetros(repLat, repLng, local.latitud, local.longitud))
      : null;

    const estaCerca = distanciaMetros !== null ? distanciaMetros <= UMBRAL_DISTANCIA_METROS : true;

    const productosListos = local.items.every((it) => {
      const st = Number(it.IDestado_detalle || it.IDestado_item || it.IDestado);
      return st === 7 || st === 8;
    });

    return {
      ...local,
      distanciaMetros,
      estaCerca,
      productosListos
    };
  });
  // 3. 📍 Determinar la SIGUIENTE PARADA en base a la ordenación por sensibilidad
  const primerLocalPendiente = localesInvolucrados.find((l) => !l.retirado);

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
  const todosLocalesRetirados = localesInvolucrados.length === 0 || localesInvolucrados.every((l) => l.retirado);

  const estaEnCamino = [5, 8].includes(estadoGlobalId);
  const estaFinalizado = [3, 6].includes(estadoGlobalId);

  const puedeIniciarRecorrido = !estaEnCamino && !estaFinalizado;
  const puedeLiberar = !estaEnCamino && !estaFinalizado;
  const puedeEntregar = estaEnCamino && !estaFinalizado;

  const enEsperadeRetiro = estaEnCamino && !todosLocalesRetirados;

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

        {/* 🗺️ MAPA INTERACTIVO */}
        <section style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <h3>🗺️ Mapa de Navegación en Tiempo Real</h3>

          {repLat != null && repLng != null ? (
            <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem' }}>
              <MapContainer center={[repLat, repLng]} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[repLat, repLng]} icon={iconoRepartidor}>
                  <Popup>
                    <strong>🚴 Tu ubicación actual (Repartidor)</strong>
                    <br />
                    Lat: {repLat.toFixed(6)}, Lng: {repLng.toFixed(6)}
                  </Popup>
                </Marker>

                {localesInvolucrados.map((local, index) => {
                  if (local.latitud == null || local.longitud == null) return null;
                  const esSiguiente = primerLocalPendiente?.id === local.id;

                  return (
                    <div key={local.id}>
                      <Marker position={[local.latitud, local.longitud]} icon={iconoLocal(esSiguiente, local.retirado)}>
                        <Popup>
                          <strong>Parada {index + 1}: {local.nombre} 🏪</strong>
                          <br />
                          Estado: {local.retirado ? '✅ Retirado' : esSiguiente ? '📍 Siguiente parada' : '⏳ En espera'}
                          <br />
                          Distancia: {local.distanciaMetros != null ? `${local.distanciaMetros}m` : 'Calculando...'}
                        </Popup>
                      </Marker>

                      {esSiguiente && !local.retirado && (
                        <Circle
                          center={[local.latitud, local.longitud]}
                          radius={UMBRAL_DISTANCIA_METROS}
                          pathOptions={{
                            color: local.estaCerca ? '#20c997' : '#fd7e14',
                            fillColor: local.estaCerca ? '#20c997' : '#fd7e14',
                            fillOpacity: 0.2
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {pedido.latitud_entrega != null && pedido.longitud_entrega != null && (
                  <Marker
                    position={[Number(pedido.latitud_entrega), Number(pedido.longitud_entrega)]}
                    icon={iconoCliente}
                  >
                    <Popup>
                      <strong>🏠 Destino del Cliente</strong>
                      <br />
                      {pedido.direccion_entrega || pedido.direccion_cliente}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', color: '#856404', textAlign: 'center' }}>
              ⏳ Esperando coordenadas GPS del repartidor para desplegar el mapa interactivo...
            </div>
          )}
        </section>

        {/* 📍 LISTADO DE LOCALES Y BOTÓN DE CONFIRMACIÓN */}
        <section style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>📍 Datos de entrega y locales</h3>
          <p>
            <strong>Dirección del cliente:</strong> {pedido.direccion_entrega || pedido.direccion_cliente || 'No informada'}
          </p>

          {/* 📞 Accesos Directos Cliente */}
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
                const habilitadoPorProximidad = local.estaCerca && esSiguienteEnRuta;

                return (
                  <div
                    key={local.id || index}
                    style={{
                      padding: '0.8rem',
                      backgroundColor: local.retirado ? '#e6fcf5' : esSiguienteEnRuta ? '#fff' : '#f1f3f5',
                      border: local.retirado ? '1px solid #20c997' : esSiguienteEnRuta ? '2px solid #1c7ed6' : '1px solid #dee2e6',
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
                      {local.retirado ? (
                        <span style={{ color: '#0ca678', fontWeight: 'bold', fontSize: '0.85rem' }}>✅ Paquete Retirado</span>
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

                    {/* 📞 Botones de contacto y Confirmación de Retiro */}
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

                      {!local.retirado ? (
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
                              : !esSiguienteEnRuta
                                ? 'Espere turno de ruta'
                                : !local.estaCerca
                                  ? `Debes estar a menos de 100m`
                                  : '📦 Confirmar Retiro'}
                          </button>

                          {!esSiguienteEnRuta && (
                            <span style={{ fontSize: '0.75rem', color: '#fa5252' }}>
                              Debe completar las paradas anteriores
                            </span>
                          )}

                          {esSiguienteEnRuta && !local.estaCerca && (
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

        {/* 🛑 AVISO VISUAL DE PAUSA EN SIMULACIÓN */}
        {enEsperadeRetiro && (
          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffe8cc', borderRadius: '8px', color: '#856404', marginBottom: '1.5rem', fontWeight: 'bold' }}>
            🛑 Simulación pausada: Llegaste al local. Debes confirmar el retiro de los productos para continuar con el recorrido.
          </div>
        )}

        {/* 📦 SECCIÓN PRODUCTOS CON ESTADO INDIVIDUAL */}
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
                        {producto.estado_detalle || (esCancelado ? 'Cancelado' : 'En proceso')}
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