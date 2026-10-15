// src/pages/Cliente/CarritoPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { crearOrden } from '../../api/ordersService';
import { getMisDirecciones } from '../../api/clientesService';
import api from '../../api/axios';
import { calcularDistanciaKm } from '../../utils/geo';
import '../../components/Cliente/CSS/Cliente.css'; // 👈 Importación correcta de los estilos unificados

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const CarritoPage = () => {
  const {
    cartItems,
    actualizarCantidad,
    removerDelCarrito,
    vaciarCarrito,
    subtotalProductosBase,
    totalAdicionales,
    subtotalConAdicionales
  } = useCart();

  const navigate = useNavigate();

  // Estados de direcciones y ubicación GPS
  const [direcciones, setDirecciones] = useState([]);
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState('');
  const [loadingDirecciones, setLoadingDirecciones] = useState(true);
  const [errorDirecciones, setErrorDirecciones] = useState('');

  // Estados de cotización y orden
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [distanciaKM, setDistanciaKM] = useState(0);
  const [tiempoEstimadoMin, setTiempoEstimadoMin] = useState(0);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState('');
  const [metodoPago, setMetodoPago] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 Estado para el Modal Estético de Avisos unificado
  const [modalAviso, setModalAviso] = useState(null); // { titulo: '', mensaje: '' }

  // Validación de límite de opciones
  const excedeLimiteOpciones = (item) => {
    if (!item.grupos_opciones || !item.opcionesDetalladas) return false;

    const proximaCantidadItem = (item.cantidad || 1) + 1;

    for (const grupo of item.grupos_opciones) {
      if (!grupo.max_seleccion) continue;

      const opcionesDelGrupo = item.opcionesDetalladas.filter((opc) => opc.grupo_id === grupo.id);
      const totalUnidadesGrupo = opcionesDelGrupo.reduce(
        (sum, opc) => sum + (opc.cantidad || 1),
        0
      );

      const totalSiSeMultiplica = totalUnidadesGrupo * proximaCantidadItem;

      if (totalSiSeMultiplica > grupo.max_seleccion) {
        return true;
      }
    }

    return false;
  };

  // 1️⃣ Cargar direcciones guardadas y seleccionar automáticamente la más cercana por GPS
  useEffect(() => {
    let isMounted = true;

    const inicializarUbicacionCarrito = async () => {
      try {
        setLoadingDirecciones(true);
        setErrorDirecciones('');

        // Obtener direcciones guardadas en la BD
        const dataDirs = await getMisDirecciones();

        // Filtrar asegurando solo objetos válidos y excluyendo registros temporales de GPS
        const listaDirecciones = Array.isArray(dataDirs)
          ? dataDirs.filter(d =>
            d &&
            d.id &&
            !d.alias?.toLowerCase().includes('ubicación actual') &&
            !d.alias?.toLowerCase().includes('ubicacion actual') &&
            !d.direccion?.toLowerCase().startsWith('lat:')
          )
          : [];

        if (!isMounted) return;

        setDirecciones(listaDirecciones);

        if (listaDirecciones.length === 0) {
          setErrorDirecciones('No tienes direcciones guardadas. Agrega una desde tu perfil.');
          setLoadingDirecciones(false);
          return;
        }

        // Obtener dirección principal como respaldo/fallback
        const dirPrincipal = listaDirecciones.find((d) => d.es_principal === 1) || listaDirecciones[0];

        // Si el navegador no soporta geolocalización, seleccionar la principal por defecto
        if (!navigator.geolocation) {
          if (dirPrincipal?.id) setDireccionSeleccionadaId(String(dirPrincipal.id));
          setLoadingDirecciones(false);
          return;
        }

        // Obtener coordenadas GPS reales del dispositivo para calcular la más cercana
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;

            const latActual = pos.coords.latitude;
            const lngActual = pos.coords.longitude;

            let direccionMasCercana = null;
            let menorDistancia = Infinity;

            // Recorrer TODAS las direcciones de la base de datos para buscar la menor distancia
            listaDirecciones.forEach((dir) => {
              if (dir.latitud !== null && dir.longitud !== null) {
                const dist = calcularDistanciaKm(
                  latActual,
                  lngActual,
                  Number(dir.latitud),
                  Number(dir.longitud)
                );

                if (dist < menorDistancia) {
                  menorDistancia = dist;
                  direccionMasCercana = dir;
                }
              }
            });

            // Selecciona la más cercana encontrada; si ninguna tiene coordenadas, usa la principal
            if (direccionMasCercana?.id) {
              setDireccionSeleccionadaId(String(direccionMasCercana.id));
            } else if (dirPrincipal?.id) {
              setDireccionSeleccionadaId(String(dirPrincipal.id));
            }

            setLoadingDirecciones(false);
          },
          (geoErr) => {
            console.warn('GPS no disponible o denegado:', geoErr);
            if (isMounted) {
              if (dirPrincipal?.id) setDireccionSeleccionadaId(String(dirPrincipal.id));
              setLoadingDirecciones(false);
            }
          },
          { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
        );

      } catch (err) {
        console.error('Error al inicializar direcciones en carrito:', err);
        if (isMounted) {
          setErrorDirecciones(
            err.response?.data?.error || 'No se pudieron cargar tus direcciones guardadas.'
          );
          setLoadingDirecciones(false);
        }
      }
    };

    inicializarUbicacionCarrito();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2️⃣ Cotizar envío cuando cambien productos o la dirección elegida
  useEffect(() => {
    if (cartItems.length === 0 || !direccionSeleccionadaId) return;

    const cotizarEnvio = async () => {
      setLoadingCotizacion(true);
      setErrorCotizacion('');

      try {
        const productosPayload = cartItems.map((item) => ({
          IDproducto: item.id,
          cantidad: item.cantidad || 1,
          opciones: item.opcionesDetalladas
            ? item.opcionesDetalladas.map((opc) => ({ id: opc.id, cantidad: opc.cantidad }))
            : item.opcionesIds || []
        }));

        const payloadCotizar = {
          productos: productosPayload,
          IDdireccion: Number(direccionSeleccionadaId)
        };

        const { data } = await api.post('/orders/cotizar', payloadCotizar);

        const costo = Number(data.costoEnvio || data.costo_envio || 0);
        const distancia = Number(data.distanciaKM || data.distanciaTotalKM || data.distancia_km || 0);
        const tiempo = Number(data.tiempoEstimadoMin || data.tiempo_estimado_min || Math.round(distancia * 3 + 15));

        setCostoEnvio(costo);
        setDistanciaKM(distancia);
        setTiempoEstimadoMin(tiempo);
      } catch (err) {
        console.error('Error al cotizar envío:', err);
        setErrorCotizacion(
          err.response?.data?.error || 'No se pudo calcular el costo de envío para esta ubicación.'
        );
      } finally {
        setLoadingCotizacion(false);
      }
    };

    cotizarEnvio();
  }, [cartItems, direccionSeleccionadaId]);

  const totalGeneral = subtotalConAdicionales + costoEnvio;

  // 3️⃣ Enviar la orden
  const handleCrearOrden = async () => {
    if (cartItems.length === 0 || !direccionSeleccionadaId) return;
    setIsSubmitting(true);

    try {
      const productosPayload = cartItems.map((item) => ({
        IDproducto: item.id,
        cantidad: item.cantidad || 1,
        comentario: item.comentario || '',
        opciones: item.opcionesDetalladas
          ? item.opcionesDetalladas.map((opc) => ({ id: opc.id, cantidad: opc.cantidad }))
          : item.opcionesIds || []
      }));

      const payloadOrden = {
        productos: productosPayload,
        IDmetodo_pago: Number(metodoPago),
        IDdireccion: Number(direccionSeleccionadaId)
      };

      const res = await crearOrden(payloadOrden);
      const ordenId = res.IDorden || res.ordenId || res.id;

      if (ordenId) {
        vaciarCarrito();

        if (Number(metodoPago) === 2 || Number(metodoPago) === 3) {
          try {
            await api.post(`/orders/${ordenId}/simular-pago`);
          } catch (simError) {
            console.error('Error al simular pago automáticamente:', simError);
          }
        }

        navigate(`/cliente/seguimiento/${ordenId}`);
      } else {
        setModalAviso({
          titulo: '⚠️ Advertencia',
          mensaje: 'El pedido se creó pero no se obtuvo un ID válido de respuesta.'
        });
      }
    } catch (err) {
      console.error('Error al crear la orden:', err);
      setModalAviso({
        titulo: '⚠️ Error al procesar pedido',
        mensaje: err.response?.data?.error || 'Ocurrió un error al procesar tu pedido.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sd-container">
      <h2 style={{ color: 'var(--sd-navy)', fontSize: '1.375rem', fontWeight: 700, marginBottom: '20px' }}>
        🛒 Tu Carrito de Compras
      </h2>

      {cartItems.length === 0 ? (
        <div className="sd-state">
          <p>El carrito está vacío.</p>
          <button
            onClick={() => navigate('/cliente/inicio')}
            className="admin-btn admin-btn--primary"
            style={{ marginTop: '8px' }}
          >
            🛍️ Ir a comprar
          </button>
        </div>
      ) : (
        <div className="sd-cart-container">
          {/* Listado de Productos */}
          <div style={{ display: 'grid', gap: '12px' }}>
            {cartItems.map((item, index) => {
              const cantidadActual = item.cantidad || 1;
              const precioUnitario = item.precioUnitarioTotal || item.precio;
              const imagenCompleta = item.imagen_url ? `${API_URL}${item.imagen_url}` : null;

              return (
                <div key={index} className="sd-cart-item">
                  {imagenCompleta && (
                    <img
                      src={imagenCompleta}
                      alt={item.nombre}
                      className="sd-cart-item__img"
                    />
                  )}

                  <div className="sd-cart-item__info">
                    <h4 className="sd-cart-item__title">{item.nombre}</h4>
                    <span className="sd-cart-item__price-unit">
                      Precio unitario: ${Number(precioUnitario).toFixed(2)}
                    </span>

                    {item.opcionesDetalladas && item.opcionesDetalladas.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '0.8125rem', color: 'var(--sd-navy)' }}>Opciones seleccionadas:</strong>
                        <ul className="sd-cart-options-list">
                          {item.opcionesDetalladas.map((opc) => (
                            <li key={opc.id}>
                              <strong>{opc.cantidad}x</strong> {opc.nombre}
                              {Number(opc.precio_adicional) > 0 && (
                                <span> (+${(Number(opc.precio_adicional) * opc.cantidad).toFixed(2)})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.comentario && (
                      <small className="admin-muted" style={{ fontStyle: 'italic', marginTop: '2px' }}>
                        Nota: {item.comentario}
                      </small>
                    )}
                  </div>

                  <div className="sd-cart-item__controls">
                    <button
                      onClick={() => actualizarCantidad(index, cantidadActual - 1)}
                      className="sd-qty-btn"
                    >
                      -
                    </button>

                    <span style={{ fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>
                      {cantidadActual}
                    </span>

                    {!item.grupos_opciones || item.grupos_opciones.length === 0 ? (
                      <button
                        onClick={() => actualizarCantidad(index, cantidadActual + 1)}
                        className="sd-qty-btn"
                      >
                        +
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          title={
                            excedeLimiteOpciones(item)
                              ? 'Supera el límite máximo permitido para alguna de las opciones'
                              : 'Duplicar ítem con las mismas opciones'
                          }
                          disabled={excedeLimiteOpciones(item)}
                          onClick={() => actualizarCantidad(index, cantidadActual + 1)}
                          className="admin-btn admin-btn--outline admin-btn--sm"
                        >
                          📋 +1 igual
                        </button>

                        <button
                          title="Agregar otro con distintas opciones"
                          onClick={() => navigate(`/cliente/locales/producto/${item.id}`)}
                          className="admin-btn admin-btn--primary admin-btn--sm"
                        >
                          ➕ Armar otro
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '90px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <p style={{ margin: 0, fontWeight: '700', color: 'var(--sd-success)', fontSize: '1rem' }}>
                      ${(precioUnitario * cantidadActual).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removerDelCarrito(index)}
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      style={{ color: 'var(--sd-error)', padding: '2px 6px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selector de Dirección de Entrega */}
          <div className="admin-subbox" style={{ backgroundColor: 'var(--sd-surface)' }}>
            <label style={{ fontWeight: '700', color: 'var(--sd-navy)', display: 'block' }}>
              📍 Dirección de Entrega (Ubicación Actual Detectada):
            </label>

            {loadingDirecciones ? (
              <small className="admin-muted">⏳ Verificando ubicación GPS actual y sincronizando direcciones...</small>
            ) : errorDirecciones ? (
              <div className="admin-banner admin-banner--error">
                ⚠️ {errorDirecciones}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '6px' }}>
                <select
                  value={direccionSeleccionadaId}
                  onChange={(e) => setDireccionSeleccionadaId(e.target.value)}
                  className="admin-select"
                  style={{ width: '100%', minHeight: '42px' }}
                >
                  {direcciones.map((dir) => (
                    <option key={dir.id} value={String(dir.id)}>
                      {dir.alias ? `[${dir.alias}] ` : ''}{dir.direccion} {dir.piso ? `(Piso ${dir.piso} ${dir.departamento || ''})` : ''} {dir.es_principal ? '★ Principal' : ''}
                    </option>
                  ))}
                </select>
                <small className="admin-muted">
                  ℹ️ El selector se actualiza automáticamente con tu ubicación GPS actual.
                </small>
              </div>
            )}
          </div>

          {/* Selector de Método de Pago */}
          <div className="admin-subbox" style={{ backgroundColor: 'var(--sd-surface)' }}>
            <label style={{ fontWeight: '700', color: 'var(--sd-navy)', display: 'block' }}>
              💳 Método de Pago:
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(Number(e.target.value))}
              className="admin-select"
              style={{ width: '100%', minHeight: '42px' }}
            >
              <option value={1}>💵 Efectivo al entregar</option>
              <option value={2}>📱 Mercado Pago</option>
              <option value={3}>💳 Tarjeta de Crédito / Débito</option>
            </select>
          </div>

          {/* Resumen del Pedido */}
          <div className="sd-cart-summary-card">
            <h3>Resumen del Pedido</h3>

            <div className="sd-cart-summary-row">
              <span>Subtotal Productos:</span>
              <span style={{ fontWeight: '600' }}>${subtotalProductosBase.toFixed(2)}</span>
            </div>

            {totalAdicionales > 0 && (
              <div className="sd-cart-summary-row" style={{ color: 'var(--sd-success)' }}>
                <span>Valor Adicional (Opciones/Extras):</span>
                <span style={{ fontWeight: '600' }}>+${totalAdicionales.toFixed(2)}</span>
              </div>
            )}

            <div className="sd-cart-summary-row" style={{ color: 'var(--sd-info)' }}>
              <span>
                Costo de Envío {distanciaKM > 0 && `(${distanciaKM.toFixed(1)} km)`}:
              </span>
              <span style={{ fontWeight: '600' }}>
                {loadingCotizacion ? '⏳ Calculando...' : `+$${costoEnvio.toFixed(2)}`}
              </span>
            </div>

            {tiempoEstimadoMin > 0 && (
              <small className="admin-muted">
                ⏱️ Tiempo estimado de entrega: ~{tiempoEstimadoMin} mins
              </small>
            )}

            {errorCotizacion && (
              <p className="admin-text-error" style={{ fontSize: '0.8125rem' }}>{errorCotizacion}</p>
            )}

            <div className="sd-cart-summary-row sd-cart-summary-row--total">
              <span>Total Final:</span>
              <span style={{ color: 'var(--sd-success)' }}>${totalGeneral.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCrearOrden}
              disabled={isSubmitting || loadingCotizacion || Boolean(errorCotizacion) || !direccionSeleccionadaId}
              className="admin-btn admin-btn--success admin-btn--block"
              style={{ minHeight: '44px', fontSize: '1rem' }}
            >
              {isSubmitting ? '⏳ Procesando Pedido...' : `Confirmar Orden ($${totalGeneral.toFixed(2)})`}
            </button>
          </div>
        </div>
      )}

      {/* 🟢 Modal Estético General de Avisos */}
      {modalAviso && (
        <div className="admin-modal-aviso-overlay">
          <div className="admin-modal-aviso-box">
            <div className="admin-modal-aviso-icon admin-modal-aviso-icon--error">
              ⚠️
            </div>
            <h3>{modalAviso.titulo}</h3>
            <p>{modalAviso.mensaje}</p>
            <div className="admin-modal-aviso-actions">
              <button
                onClick={() => setModalAviso(null)}
                className="admin-btn admin-btn--primary"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};