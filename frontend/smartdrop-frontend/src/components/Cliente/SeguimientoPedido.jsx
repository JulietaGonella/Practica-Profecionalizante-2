// src/components/Cliente/SeguimientoPedido.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getPedidoById, getOrderTracking } from '../../api/ordersService';
import api from '../../api/axios';
import { obtenerEstadoEfectivoCliente, SECUENCIA_ESTADOS } from '../../utils/estados';
import L from 'leaflet';
import '../../components/Cliente/CSS/Cliente.css'; // 👈 Importación correcta de los estilos unificados

export const SeguimientoPedido = () => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [mensajeBanner, setMensajeBanner] = useState(''); // 🟢 Estado para el banner visual estético

  // 📍 Estado para almacenar las coordenadas GPS del repartidor en tiempo real
  const [repartidorGps, setRepartidorGps] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const repartidorMarkerRef = useRef(null);
  const localMarkersMapRef = useRef(new Map());

  const paymentStatusParam = searchParams.get('status') || searchParams.get('collection_status');

  const cargarPedido = async () => {
    try {
      setError('');
      const data = await getPedidoById(ordenId);
      let pedidoRaw = Array.isArray(data) ? data[0] : (data?.orden || data?.pedido || data?.data || data);

      if (pedidoRaw) {
        pedidoRaw.IDorden = pedidoRaw.IDorden || pedidoRaw.id || pedidoRaw.id_orden || ordenId;
        pedidoRaw.IDestado = pedidoRaw.IDestado || pedidoRaw.id_estado || pedidoRaw.IDestado_orden || 1;
      }

      if (!pedidoRaw || typeof pedidoRaw !== 'object') {
        throw new Error(`Verifica que la orden ID #${ordenId} exista en tu historial.`);
      }

      setOrden(pedidoRaw);
    } catch (err) {
      console.error('Error al cargar la orden:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'No se pudo encontrar el pedido solicitado.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 1. Carga de estado general del pedido
  useEffect(() => {
    if (ordenId) {
      cargarPedido();
      const interval = setInterval(cargarPedido, 1000);
      return () => clearInterval(interval);
    }
  }, [ordenId]);

  // --- GPS Y SEGUIMIENTO EN TIEMPO REAL DEL REPARTIDOR ---
  useEffect(() => {
    const tieneRepartidor = Boolean(orden?.IDrepartidor || orden?.repartidor_asignado || orden?.repartidor);

    if (
      !ordenId ||
      !orden ||
      Number(orden.IDestado) === 3 ||
      Number(orden.IDestado) === 6
    ) {
      return;
    }

    if (!tieneRepartidor) {
      setRepartidorGps(null);
      if (repartidorMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(repartidorMarkerRef.current);
        repartidorMarkerRef.current = null;
      }
      return;
    }

    const consultarTrackingGPS = async () => {
      try {
        const dataTracking = await getOrderTracking(ordenId);
        const repData = dataTracking?.repartidor;

        const latitud = repData?.ubicacion?.latitud ?? repData?.latitud;
        const longitud = repData?.ubicacion?.longitud ?? repData?.longitud;

        if (repData && latitud != null && longitud != null) {
          const lat = Number(latitud);
          const lng = Number(longitud);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          setRepartidorGps({ lat, lng });

          if (repartidorMarkerRef.current) {
            repartidorMarkerRef.current.setLatLng([lat, lng]);
          } else if (mapInstanceRef.current) {
            const repIcon = L.divIcon({
              className: 'custom-pin',
              html: '<div style="background-color: #f59f00; color: white; padding: 6px; border-radius: 50%; text-align: center; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.3s ease;">🚴</div>',
              iconSize: [30, 30]
            });

            repartidorMarkerRef.current = L.marker([lat, lng], { icon: repIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('<b>Repartidor en camino</b>');
          }
        } else {
          setRepartidorGps(null);
          if (repartidorMarkerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(repartidorMarkerRef.current);
            repartidorMarkerRef.current = null;
          }
        }
      } catch (err) {
        console.warn('Error al consultar GPS:', err.message);
      }
    };

    consultarTrackingGPS();
    const intervalGPS = setInterval(consultarTrackingGPS, 500);
    return () => clearInterval(intervalGPS);
  }, [ordenId, orden?.IDestado, orden?.IDrepartidor, orden?.repartidor]);

  // --- RENDERIZADO E INICIALIZACIÓN DEL MAPA Y ZOOM DINÁMICO ---
  useEffect(() => {
    if (!orden || loading || !mapRef.current) return;

    const latCliente = Number(orden.latitud_entrega || orden.latitud || -32.4080);
    const lngCliente = Number(orden.longitud_entrega || orden.longitud || -63.2410);

    const listaProductos = orden.productos || orden.detalles || [];
    const localesMap = new Map();

    // 1. Agrupar productos por local y calcular rechazos / retiros
    listaProductos.forEach((p) => {
      if (p.latitud && p.longitud) {
        const idLocal = p.IDlocal || p.local;
        const estadoProd = Number(p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado);
        const estaRetirado = estadoProd === 8 || Boolean(orden.retiro_confirmado);
        const estaRechazado = estadoProd === 6;

        if (!localesMap.has(idLocal)) {
          localesMap.set(idLocal, {
            id: idLocal,
            nombre: p.local || 'Local Comercial',
            lat: Number(p.latitud),
            lng: Number(p.longitud),
            totalProductos: 0,
            rechazados: 0,
            retirados: 0
          });
        }

        const localData = localesMap.get(idLocal);
        localData.totalProductos += 1;
        if (estaRechazado) localData.rechazados += 1;
        if (estaRetirado) localData.retirados += 1;
      }
    });

    // Determinar estado final de cada local
    localesMap.forEach((local) => {
      local.todosRechazados = local.totalProductos > 0 && local.rechazados === local.totalProductos;
      local.retirado = !local.todosRechazados && ((local.retirados + local.rechazados) === local.totalProductos);
      local.pendiente = !local.todosRechazados && !local.retirado;
    });

    // 2. Inicializar mapa e ícono del cliente
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([latCliente, lngCliente], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;

      const clienteIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div style="background-color: #2b8a3e; color: white; padding: 6px; border-radius: 50%; text-align: center; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏠</div>',
        iconSize: [30, 30]
      });

      L.marker([latCliente, lngCliente], { icon: clienteIcon })
        .addTo(map)
        .bindPopup(`<b>Dirección de Entrega</b><br>${orden.direccion_entrega || 'Tu ubicación'}`);
    }

    const map = mapInstanceRef.current;

    // 3. Renderizar o actualizar marcadores visuales de los locales
    localesMap.forEach((local, idLocal) => {
      let bgColor = '#1c7ed6';
      let iconEmoji = '🏪';
      let opacity = 1;
      let estadoTexto = '⏳ Esperando retiro';

      if (local.todosRechazados) {
        bgColor = '#e03131';
        iconEmoji = '❌';
        opacity = 0.5;
        estadoTexto = '❌ Productos Rechazados (No requiere visita)';
      } else if (local.retirado) {
        bgColor = '#20c997';
        opacity = 0.6;
        estadoTexto = '✅ Productos Retirados';
      }

      const iconHtml = `<div style="background-color: ${bgColor}; color: white; padding: 6px; border-radius: 50%; text-align: center; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); opacity: ${opacity}; transition: all 0.4s ease;">${iconEmoji}</div>`;

      const localIcon = L.divIcon({
        className: 'custom-pin',
        html: iconHtml,
        iconSize: [30, 30]
      });

      const popupContent = `<b>Local:</b> ${local.nombre}<br><b>Estado:</b> ${estadoTexto}`;

      if (localMarkersMapRef.current.has(idLocal)) {
        const existingMarker = localMarkersMapRef.current.get(idLocal);
        existingMarker.setIcon(localIcon);
        existingMarker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([local.lat, local.lng], { icon: localIcon })
          .addTo(map)
          .bindPopup(popupContent);
        localMarkersMapRef.current.set(idLocal, marker);
      }
    });

    // 4. CÁLCULO DINÁMICO DE BOUNDS (Solo locales PENDIENTES activos)
    const tieneRepartidorAsignado = Boolean(orden.IDrepartidor || orden.repartidor_asignado || orden.repartidor);

    if (!tieneRepartidorAsignado && repartidorMarkerRef.current) {
      map.removeLayer(repartidorMarkerRef.current);
      repartidorMarkerRef.current = null;
    }

    const latRep = repartidorGps?.lat ?? Number(orden.repartidor?.latitud ?? orden.repartidor?.ubicacion?.latitud);
    const lngRep = repartidorGps?.lng ?? Number(orden.repartidor?.longitud ?? orden.repartidor?.ubicacion?.longitud);
    const tieneGpsRepartidor = tieneRepartidorAsignado && Number.isFinite(latRep) && Number.isFinite(lngRep);

    const localesPendientes = Array.from(localesMap.values()).filter(l => l.pendiente);

    const bounds = L.latLngBounds([[latCliente, lngCliente]]);

    if (tieneGpsRepartidor) {
      bounds.extend([latRep, lngRep]);
    }

    localesPendientes.forEach((local) => {
      bounds.extend([local.lat, local.lng]);
    });

    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 20,
      animate: true
    });

  }, [orden?.IDestado, orden?.IDrepartidor, orden?.repartidor, orden?.retiro_confirmado, loading, repartidorGps]);

  // --- REDIRECCIÓN SI PASA A ENTREGADO ---
  useEffect(() => {
    if (orden && Number(orden.IDestado) === 3) {
      navigate('/cliente/pedidos', { replace: true });
    }
  }, [orden, navigate]);

  // Limpiar mapa al desmontar
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      repartidorMarkerRef.current = null;
      localMarkersMapRef.current.clear();
    };
  }, []);

  if (loading) {
    return <div className="sd-state"><div className="sd-spinner"></div><p>Cargando estado del pedido...</p></div>;
  }

  if (error) {
    return (
      <div className="sd-container">
        <div className="admin-banner admin-banner--error">⚠️ {error}</div>
      </div>
    );
  }

  const listaProductos = orden.productos || orden.detalles || [];
  const productosActivos = listaProductos.filter((p) => {
    const estadoId = p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado;
    return Number(estadoId) !== 6;
  });

  const idEstadoEfectivo = obtenerEstadoEfectivoCliente(orden);
  const estadoGeneralConfig = SECUENCIA_ESTADOS[idEstadoEfectivo] || {
    bg: 'var(--sd-surface-muted)',
    color: 'var(--sd-text-main)',
    etiqueta: orden.estado_orden || 'En proceso'
  };

  const subtotal = Number(orden.subtotal ?? orden.precio ?? 0);
  const costoEnvio = Number(orden.costo_envio ?? orden.envio ?? 0);
  const totalPedido = Number(orden.total ?? subtotal + costoEnvio);
  const metodoPago = orden.metodo_pago || orden.forma_pago || orden.medio_pago || 'No informado';
  const metodoPagoTexto = metodoPago.toLowerCase();
  const idMetodoPago = Number(orden.IDmetodo_pago ?? 1);
  const esEfectivo = idMetodoPago === 1 || metodoPagoTexto.includes('efectivo');

  const rawEstadoPago = (orden.estado_pago || paymentStatusParam || 'pendiente').toLowerCase();
  let estadoPagoNormalizado = 'pendiente';

  if (['aprobado', 'approved'].includes(rawEstadoPago)) {
    estadoPagoNormalizado = 'aprobado';
  } else if (['rechazado', 'rejected', 'cancelled'].includes(rawEstadoPago)) {
    estadoPagoNormalizado = 'rechazado';
  }

  const configBadgePago = {
    aprobado: { bg: 'var(--sd-tint-success)', color: 'var(--sd-success)', texto: 'PAGO APROBADO' },
    pendiente: { bg: 'var(--sd-tint-warning)', color: 'var(--sd-warning)', texto: 'PAGO PENDIENTE' },
    rechazado: { bg: 'var(--sd-tint-error)', color: 'var(--sd-error)', texto: 'PAGO RECHAZADO' }
  };

  const currentBadge = configBadgePago[estadoPagoNormalizado];
  const estadosItemsActivos = productosActivos.map(
    (p) => p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado ?? orden.IDestado
  );
  const estanTodosMismoEstado =
    estadosItemsActivos.length > 0 &&
    estadosItemsActivos.every((st) => st === estadosItemsActivos[0]);

  return (
    <div className="sd-container">
      <div className="sd-tracking-container">
        <h2 style={{ color: 'var(--sd-navy)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
          📦 Seguimiento del Pedido #{orden.IDorden || ordenId}
        </h2>

        {/* 🟢 Banner visual estético para notificaciones / errores de pago */}
        {mensajeBanner && (
          <div className="sd-tracking-banner">
            <span>{mensajeBanner}</span>
            <button
              onClick={() => setMensajeBanner('')}
              className="admin-btn admin-btn--ghost admin-btn--sm"
              style={{ color: 'var(--sd-info)', padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* MAPA DE SEGUIMIENTO */}
        <div className="sd-tracking-map-section">
          <h4 style={{ color: 'var(--sd-navy)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
            🗺️ Mapa de Seguimiento en Vivo
          </h4>

          <div
            ref={mapRef}
            className="sd-map-wrapper"
            style={{ height: '320px' }}
          />

          <div className="sd-tracking-map-legend">
            <span>🏪 <b>Local Pendiente</b></span>
            <span>✅ <b>Local Retirado</b></span>
            <span>❌ <b>Local Rechazado</b></span>
            <span>🏠 <b>Tu Dirección</b></span>
            {(orden.IDrepartidor || orden.repartidor_asignado || orden.repartidor) && (
              <span>🚴 <b>Repartidor</b></span>
            )}
          </div>
        </div>

        {/* Estado General */}
        <div
          className="sd-tracking-status-box"
          style={{
            backgroundColor: estadoGeneralConfig.bg,
            color: estadoGeneralConfig.color,
            border: '1px solid var(--sd-border)'
          }}
        >
          Estado General: {estadoGeneralConfig.etiqueta}
        </div>

        {/* Mensaje de Pedido Cancelado */}
        {Number(orden.IDestado) === 6 && (
          <div className="admin-banner admin-banner--error" style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>🚫 Pedido Cancelado</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              <strong>Motivo:</strong> {orden.motivo_cancelacion || 'El pedido fue cancelado.'}
            </p>
          </div>
        )}

        {/* Repartidor Asignado */}
        {(orden.repartidor_asignado || orden.IDrepartidor) && (
          <div className="admin-banner admin-banner--info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>🚴 ¡Repartidor Asignado!</strong>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              {orden.repartidor?.nombre
                ? `${orden.repartidor.nombre} ${orden.repartidor.apellido || ''} se encargará de retirar y entregar tu pedido.`
                : 'Un repartidor ya ha tomado tu pedido y se encuentra en camino al local.'}
            </p>
          </div>
        )}

        {/* Ubicación */}
        <div className="admin-subbox" style={{ backgroundColor: 'var(--sd-surface-muted)' }}>
          <h4 style={{ color: ' var(--sd-info)', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 4px 0' }}>
            📍 Ubicación de Entrega
          </h4>
          <p style={{ margin: 0, color: 'var(--sd-text-main)', fontWeight: '500', fontSize: '0.9rem' }}>
            {orden.direccion_entrega || 'Dirección no especificada'}
          </p>
        </div>

        {/* Productos */}
        <div className="admin-subbox" style={{ backgroundColor: 'var(--sd-surface)' }}>
          <h4 style={{ color: 'var(--sd-navy)', fontSize: '1rem', fontWeight: 700, margin: '0 ' }}>
            📋 Estado Individual por Producto
          </h4>
          <div className="sd-tracking-products-list">
            {listaProductos.map((prod, idx) => {
              const estadoIdProd = Number(
                prod.IDestado_item ?? prod.IDestado_detalle ?? prod.IDestado ?? orden.IDestado
              );

              const esCancelado = estadoIdProd === 6;
              const configItem = SECUENCIA_ESTADOS[estadoIdProd] || {
                bg: esCancelado ? 'var(--sd-tint-error)' : 'var(--sd-surface-muted)',
                color: esCancelado ? 'var(--sd-error)' : 'var(--sd-text-secondary)',
                etiqueta: esCancelado ? 'Cancelado / Rechazado' : prod.estado_item || 'Pendiente'
              };

              const motivoRechazoItem =
                prod.motivo_rechazo || prod.motivo_cancelacion || orden.motivo_cancelacion;

              return (
                <div
                  key={idx}
                  className={`sd-tracking-product-item ${esCancelado ? 'sd-tracking-product-item--cancelled' : ''}`}
                >
                  <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div
                      style={{
                        fontWeight: '600',
                        textDecoration: esCancelado ? 'line-through' : 'none',
                        color: esCancelado ? 'var(--sd-text-secondary)' : 'var(--sd-navy)',
                        fontSize: '0.9rem'
                      }}
                    >
                      {prod.cantidad}x {prod.producto || prod.nombre}
                    </div>

                    {prod.opciones && prod.opciones.length > 0 && (
                      <div className="admin-muted" style={{ fontSize: '0.8125rem' }}>
                        <strong>Opciones:</strong>{' '}
                        {prod.opciones
                          .map((o) => {
                            const cant = o.cantidad || 1;
                            const cantStr = cant > 1 ? `${cant}x ` : '';
                            const precioUnit = Number(o.precio_adicional || 0);
                            let precioStr = '';
                            if (precioUnit > 0) {
                              precioStr =
                                cant > 1
                                  ? ` (+$${precioUnit.toFixed(2)} c/u = +$${(precioUnit * cant).toFixed(2)})`
                                  : ` (+$${precioUnit.toFixed(2)})`;
                            }
                            return `${cantStr}${o.nombre}${precioStr}`;
                          })
                          .join(', ')}
                      </div>
                    )}

                    {prod.local && (
                      <div className="admin-muted" style={{ fontSize: '0.75rem' }}>
                        🏪 Local: {prod.local}
                      </div>
                    )}

                    {esCancelado && motivoRechazoItem && (
                      <div className="admin-text-error" style={{ fontSize: '0.8125rem', fontWeight: '500', marginTop: '2px' }}>
                        ⚠️ <strong>Motivo de rechazo/cancelación:</strong> {motivoRechazoItem}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '4px 10px',
                      backgroundColor: configItem.bg,
                      color: configItem.color,
                      borderRadius: '12px',
                      fontSize: '0.8125rem',
                      fontWeight: '700'
                    }}
                  >
                    {configItem.etiqueta}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!estanTodosMismoEstado && productosActivos.length > 0 && (
          <div className="admin-banner admin-banner--info" style={{ fontSize: '0.875rem' }}>
            ℹ️ Los productos de tu pedido se encuentran en diferentes etapas de preparación/despacho. El estado general se actualizará a la siguiente fase cuando todos los locales/productos coincidan en el mismo estado.
          </div>
        )}

        {/* Resumen */}
        <div className="sd-tracking-summary-box">
          <h4 style={{ color: 'var(--sd-navy)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
            💳 Resumen del Pedido
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              rowGap: '6px',
              columnGap: '12px',
              fontSize: '0.9rem'
            }}
          >
            <span>Subtotal</span>
            <span style={{ fontWeight: '600' }}>$ {subtotal.toFixed(2)}</span>

            <span>Envío</span>
            <span style={{ fontWeight: '600' }}>$ {costoEnvio.toFixed(2)}</span>

            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--sd-navy)' }}>Total a pagar</span>
            <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--sd-success)' }}>
              $ {totalPedido.toFixed(2)}
            </span>
          </div>

          <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--sd-border)' }}>
            <p className="admin-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              <strong style={{ color: 'var(--sd-text-main)' }}>Método de pago:</strong> {metodoPago}
            </p>

            {!esEfectivo && (
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--sd-text-main)' }}>Estado del pago:</strong>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    backgroundColor: currentBadge.bg,
                    color: currentBadge.color
                  }}
                >
                  {currentBadge.texto}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Banner de Pagos */}
        {!esEfectivo && estadoPagoNormalizado === 'aprobado' && (
          <div className="admin-banner admin-banner--success" style={{ textAlign: 'center', fontWeight: '700' }}>
            🎉 ¡Pago aprobado con éxito! Tu pedido ha sido enviado al local para su preparación.
          </div>
        )}

        {esEfectivo && (
          <div className="admin-banner admin-banner--info" style={{ textAlign: 'center', fontWeight: '700' }}>
            💵 Pago en efectivo: Abonarás en el punto de entrega directamente al repartidor al recibir tu compra.
          </div>
        )}

        {!esEfectivo && estadoPagoNormalizado === 'pendiente' && (
          <div className="admin-banner admin-banner--warning" style={{ textAlign: 'center', fontWeight: '700' }}>
            ⏳ Tu pago está en proceso de revisión por parte de la pasarela. Te avisaremos apenas sea acreditado.
          </div>
        )}

        {/* Botón Simular Pago Demo */}
        {!esEfectivo && estadoPagoNormalizado === 'pendiente' && (
          <div className="admin-subbox" style={{ backgroundColor: 'var(--sd-surface)', border: '1px dashed var(--sd-success)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '700', color: 'var(--sd-success)', fontSize: '0.9rem' }}>
              🧪 Modo Demo Activo (Pasarela Online):
            </p>
            <button
              disabled={isSimulating}
              onClick={async () => {
                setIsSimulating(true);
                setMensajeBanner('');
                try {
                  await api.post(`/orders/${ordenId}/simular-pago`);
                  setMensajeBanner('✓ ¡Pago simulado correctamente como aprobado!');
                  await cargarPedido();
                } catch (error) {
                  setMensajeBanner(error.response?.data?.error || '⚠️ Error al simular el pago');
                } finally {
                  setIsSimulating(false);
                }
              }}
              className="admin-btn admin-btn--success"
              style={{ width: '100%', minHeight: '40px', fontWeight: '700' }}
            >
              {isSimulating ? '⏳ Procesando pago...' : '✅ Simular Pago Exitoso (Mercado Pago)'}
            </button>
          </div>
        )}

        {!esEfectivo && estadoPagoNormalizado === 'rechazado' && (
          <div className="admin-banner admin-banner--error" style={{ textAlign: 'center', fontWeight: '700' }}>
            ⚠️ La transacción del pago ha fallado o fue rechazada. Por favor, intenta realizar la compra con otro medio de pago.
          </div>
        )}

        {/* Código OTP */}
        {orden.codigo_otp && (
          <div className="sd-tracking-otp-box">
            <p className="admin-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              Muestra este código al repartidor para recibir tu pedido:
            </p>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--sd-info)', letterSpacing: '2px' }}>
              {orden.codigo_otp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};