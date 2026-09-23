// src/pages/Cliente/CarritoPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { crearOrden } from '../../api/ordersService';
import { getMisDirecciones } from '../../api/clientesService';
import api from '../../api/axios';
import { calcularDistanciaKm } from '../../utils/geo';

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

  // 1️⃣ Cargar direcciones y verificar la ubicación GPS actual
  useEffect(() => {
    let isMounted = true;

    const inicializarUbicacionCarrito = async () => {
      try {
        setLoadingDirecciones(true);
        setErrorDirecciones('');

        const dataDirs = await getMisDirecciones();
        const listaDirecciones = Array.isArray(dataDirs) ? dataDirs : [];
        
        if (!isMounted) return;
        setDirecciones(listaDirecciones);

        if (listaDirecciones.length === 0) {
          setErrorDirecciones('No tienes direcciones guardadas. Agrega una desde tu perfil.');
          setLoadingDirecciones(false);
          return;
        }

        const dirPrincipal = listaDirecciones.find((d) => d.es_principal === 1) || listaDirecciones[0];

        if (!navigator.geolocation) {
          if (dirPrincipal?.id) setDireccionSeleccionadaId(String(dirPrincipal.id));
          setLoadingDirecciones(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;
            const latActual = pos.coords.latitude;
            const lngActual = pos.coords.longitude;
            const TOLERANCIA_KM = 0.5;

            let direccionCercana = null;
            let menorDistancia = Infinity;

            listaDirecciones.forEach((dir) => {
              if (dir.latitud && dir.longitud) {
                const dist = calcularDistanciaKm(
                  latActual,
                  lngActual,
                  Number(dir.latitud),
                  Number(dir.longitud)
                );
                if (dist <= TOLERANCIA_KM && dist < menorDistancia) {
                  menorDistancia = dist;
                  direccionCercana = dir;
                }
              }
            });

            if (direccionCercana?.id) {
              setDireccionSeleccionadaId(String(direccionCercana.id));
            } else if (dirPrincipal?.id) {
              setDireccionSeleccionadaId(String(dirPrincipal.id));
            }
            setLoadingDirecciones(false);
          },
          (geoErr) => {
            console.warn('GPS no disponible o denegado en el carrito:', geoErr);
            if (isMounted) {
              if (dirPrincipal?.id) setDireccionSeleccionadaId(String(dirPrincipal.id));
              setLoadingDirecciones(false);
            }
          },
          { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
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
        alert("El pedido se creó pero no se obtuvo un ID válido de respuesta.");
      }
    } catch (err) {
      console.error('Error al crear la orden:', err);
      alert(err.response?.data?.error || 'Ocurrió un error al procesar tu pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🛒 Tu Carrito de Compras</h2>

      {cartItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p>El carrito está vacío.</p>
          <button
            onClick={() => navigate('/cliente/inicio')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#1c7ed6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🛍️ Ir a comprar
          </button>
        </div>
      ) : (
        <>
          {/* Listado de Productos */}
          <div style={{ marginBottom: '1.5rem' }}>
            {cartItems.map((item, index) => {
              const cantidadActual = item.cantidad || 1;
              const precioUnitario = item.precioUnitarioTotal || item.precio;
              const imagenCompleta = item.imagen_url ? `${API_URL}${item.imagen_url}` : null;

              return (
                <div
                  key={index}
                  style={{
                    borderBottom: '1px solid #ddd',
                    padding: '1rem 0',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                >
                  {imagenCompleta && (
                    <img
                      src={imagenCompleta}
                      alt={item.nombre}
                      style={{
                        width: '70px',
                        height: '70px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #eee'
                      }}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{item.nombre}</h4>
                    <small style={{ color: '#666' }}>
                      Precio unitario: ${Number(precioUnitario).toFixed(2)}
                    </small>

                    {item.opcionesDetalladas && item.opcionesDetalladas.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.2rem' }}>
                        <strong>Opciones seleccionadas:</strong>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
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
                      <small style={{ display: 'block', fontStyle: 'italic', color: '#888', marginTop: '0.2rem' }}>
                        Nota: {item.comentario}
                      </small>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => actualizarCantidad(index, cantidadActual - 1)}
                      style={{ padding: '0.2rem 0.6rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      -
                    </button>

                    <span style={{ fontWeight: 'bold' }}>{cantidadActual}</span>

                    {!item.grupos_opciones || item.grupos_opciones.length === 0 ? (
                      <button
                        onClick={() => actualizarCantidad(index, cantidadActual + 1)}
                        style={{ padding: '0.2rem 0.6rem', fontWeight: 'bold', cursor: 'pointer' }}
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
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.8rem',
                            cursor: excedeLimiteOpciones(item) ? 'not-allowed' : 'pointer',
                            opacity: excedeLimiteOpciones(item) ? 0.5 : 1
                          }}
                        >
                          📋 +1 igual
                        </button>

                        <button
                          title="Agregar otro con distintas opciones"
                          onClick={() => navigate(`/cliente/locales/producto/${item.id}`)}
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            backgroundColor: '#1c7ed6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px'
                          }}
                        >
                          ➕ Armar otro
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>
                      ${(precioUnitario * cantidadActual).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removerDelCarrito(index)}
                      style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selector de Dirección de Entrega */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              📍 Dirección de Entrega (Ubicación Actual Detectada):
            </label>

            {loadingDirecciones ? (
              <small>⏳ Verificando ubicación GPS actual y sincronizando direcciones...</small>
            ) : errorDirecciones ? (
              <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: '6px', color: '#e03131', fontSize: '0.9rem' }}>
                ⚠️ {errorDirecciones}
              </div>
            ) : (
              <div>
                <select
                  value={direccionSeleccionadaId}
                  onChange={(e) => setDireccionSeleccionadaId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
                >
                  {direcciones.map((dir) => (
                    <option key={dir.id} value={String(dir.id)}>
                      {dir.alias ? `[${dir.alias}] ` : ''}{dir.direccion} {dir.piso ? `(Piso ${dir.piso} ${dir.departamento || ''})` : ''} {dir.es_principal ? '★ Principal' : ''}
                    </option>
                  ))}
                </select>
                <small style={{ display: 'block', marginTop: '0.4rem', color: '#666' }}>
                  ℹ️ El selector se actualiza automáticamente con tu ubicación GPS actual.
                </small>
              </div>
            )}
          </div>

          {/* Selector de Método de Pago */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              💳 Método de Pago:
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value={1}>💵 Efectivo al entregar</option>
              <option value={2}>📱 Mercado Pago</option>
              <option value={3}>💳 Tarjeta de Crédito / Débito</option>
            </select>
          </div>

          {/* Resumen del Pedido */}
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}
          >
            <h3>Resumen del Pedido</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Subtotal Productos:</span>
              <span>${subtotalProductosBase.toFixed(2)}</span>
            </div>

            {totalAdicionales > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#2b8a3e' }}>
                <span>Valor Adicional (Opciones/Extras):</span>
                <span>+${totalAdicionales.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#1c7ed6' }}>
              <span>
                Costo de Envío {distanciaKM > 0 && `(${distanciaKM.toFixed(1)} km)`}:
              </span>
              <span>
                {loadingCotizacion ? '⏳ Calculando...' : `+$${costoEnvio.toFixed(2)}`}
              </span>
            </div>

            {tiempoEstimadoMin > 0 && (
              <small style={{ color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                ⏱️ Tiempo estimado de entrega: ~{tiempoEstimadoMin} mins
              </small>
            )}

            {errorCotizacion && (
              <p style={{ color: 'red', fontSize: '0.85rem', margin: '0.5rem 0' }}>{errorCotizacion}</p>
            )}

            <hr style={{ margin: '0.8rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem' }}>
              <span>Total Final:</span>
              <span>${totalGeneral.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCrearOrden}
              disabled={isSubmitting || loadingCotizacion || Boolean(errorCotizacion) || !direccionSeleccionadaId}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.8rem',
                backgroundColor: isSubmitting || loadingCotizacion || Boolean(errorCotizacion) || !direccionSeleccionadaId ? '#ccc' : '#2b8a3e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: isSubmitting || loadingCotizacion || Boolean(errorCotizacion) || !direccionSeleccionadaId ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? '⏳ Procesando Pedido...' : `Confirmar Orden ($${totalGeneral.toFixed(2)})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};