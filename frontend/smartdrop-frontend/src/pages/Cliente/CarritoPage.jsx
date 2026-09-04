import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { crearOrden } from '../../api/ordersService';
import { getMisDirecciones } from '../../api/clientesService';
import api from '../../api/axios';

const API_URL = 'http://localhost:3000';

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

  // Modos de selección: 'guardada' | 'gps_puntual'
  const [modoUbicacion, setModoUbicacion] = useState('guardada');
  const [ubicacionGpsPuntual, setUbicacionGpsPuntual] = useState(null);
  const [obteniendoGps, setObteniendoGps] = useState(false);

  // Estados de cotización y orden
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [distanciaKM, setDistanciaKM] = useState(0);
  const [tiempoEstimadoMin, setTiempoEstimadoMin] = useState(0);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [errorCotizacion, setErrorCotizacion] = useState('');
  const [metodoPago, setMetodoPago] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función de validación para el límite de opciones
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

  // 1️⃣ Cargar direcciones del cliente al montar
  useEffect(() => {
    const cargarDirecciones = async () => {
      try {
        setLoadingDirecciones(true);
        setErrorDirecciones('');
        const data = await getMisDirecciones();
        setDirecciones(data);

        // Seleccionar la principal por defecto
        const principal = data.find((d) => d.es_principal === 1) || data[0];
        if (principal) {
          setDireccionSeleccionadaId(principal.id);
        }
      } catch (err) {
        console.error('Error al cargar direcciones:', err);
        setErrorDirecciones(
          err.response?.data?.error || 'No se pudieron cargar tus direcciones guardadas. Intenta recargar la página o usa la ubicación GPS.'
        );
      } finally {
        setLoadingDirecciones(false);
      }
    };

    cargarDirecciones();
  }, []);

  // Manejador para obtener la ubicación GPS actual
  const handleUsarGpsPuntual = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          direccion: 'Ubicación actual vía GPS',
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        };
        setUbicacionGpsPuntual(coords);
        setModoUbicacion('gps_puntual');
        setObteniendoGps(false);
      },
      (error) => {
        console.error('Error al obtener ubicación GPS:', error);
        alert('No se pudo obtener la ubicación GPS. Verifica los permisos de tu navegador.');
        setObteniendoGps(false);
      }
    );
  };

  // 2️⃣ Cotizar envío cuando cambien productos, modo de ubicación o dirección elegida
  useEffect(() => {
    if (cartItems.length === 0) return;

    // Validación según el modo activo
    if (modoUbicacion === 'guardada' && !direccionSeleccionadaId && direcciones.length > 0) return;
    if (modoUbicacion === 'gps_puntual' && !ubicacionGpsPuntual) return;

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
          ...(modoUbicacion === 'guardada'
            ? { IDdireccion: direccionSeleccionadaId ? Number(direccionSeleccionadaId) : undefined }
            : { ubicacionPersonalizada: ubicacionGpsPuntual })
        };

        const { data } = await api.post('/orders/cotizar', payloadCotizar);

        setCostoEnvio(Number(data.costoEnvio || 0));
        setDistanciaKM(Number(data.distanciaKM || 0));
        setTiempoEstimadoMin(Number(data.tiempoEstimadoMin || 0));
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
  }, [cartItems, direccionSeleccionadaId, modoUbicacion, ubicacionGpsPuntual, direcciones.length]);

  const totalGeneral = subtotalConAdicionales + costoEnvio;

  // 3️⃣ Enviar la orden
  const handleCrearOrden = async () => {
    if (cartItems.length === 0) return;
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
        ...(modoUbicacion === 'guardada'
          ? { IDdireccion: direccionSeleccionadaId ? Number(direccionSeleccionadaId) : undefined }
          : { ubicacionPersonalizada: ubicacionGpsPuntual })
      };

      const res = await crearOrden(payloadOrden);
      const ordenId = res.IDorden || res.ordenId || res.id;

      if (ordenId) {
        vaciarCarrito();

        // Si el método es Mercado Pago (2) o Tarjeta (3), ejecuta la simulación
        if (Number(metodoPago) === 2 || Number(metodoPago) === 3) {
          try {
            await api.post(`/orders/${ordenId}/simular-pago`);
          } catch (simError) {
            console.error('Error al simular pago automáticamente:', simError);
          }
        }

        // Para Efectivo (1) u otros, redirige directamente al seguimiento sin simular pago
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
                  {/* 🖼️ Miniatura de la Imagen */}
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

          {/* Selector de Dirección / Ubicación GPS */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              📍 Dirección de Entrega:
            </label>

            {loadingDirecciones ? (
              <small>Cargando tus direcciones...</small>
            ) : errorDirecciones ? (
              <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: '6px', color: '#e03131', fontSize: '0.9rem' }}>
                ⚠️ {errorDirecciones}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setModoUbicacion('guardada')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      backgroundColor: modoUbicacion === 'guardada' ? '#1c7ed6' : '#f0f0f0',
                      color: modoUbicacion === 'guardada' ? '#fff' : '#333',
                      cursor: 'pointer',
                      fontWeight: modoUbicacion === 'guardada' ? 'bold' : 'normal'
                    }}
                  >
                    🏠 Mis Ubicaciones
                  </button>

                  <button
                    type="button"
                    onClick={handleUsarGpsPuntual}
                    disabled={obteniendoGps}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      backgroundColor: modoUbicacion === 'gps_puntual' ? '#1c7ed6' : '#f0f0f0',
                      color: modoUbicacion === 'gps_puntual' ? '#fff' : '#333',
                      cursor: 'pointer',
                      fontWeight: modoUbicacion === 'gps_puntual' ? 'bold' : 'normal'
                    }}
                  >
                    {obteniendoGps ? '⏳ Obteniendo GPS...' : '🎯 Utilizar Ubicación GPS Actual'}
                  </button>
                </div>

                {modoUbicacion === 'guardada' && (
                  direcciones.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#d9480f' }}>
                      No tienes direcciones guardadas. Puedes usar la ubicación GPS puntual.
                    </p>
                  ) : (
                    <select
                      value={direccionSeleccionadaId}
                      onChange={(e) => setDireccionSeleccionadaId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      {direcciones.map((dir) => (
                        <option key={dir.id} value={dir.id}>
                          {dir.alias ? `[${dir.alias}] ` : ''}{dir.direccion} {dir.piso ? `(Piso ${dir.piso} ${dir.departamento || ''})` : ''} {dir.es_principal ? '★ Principal' : ''}
                        </option>
                      ))}
                    </select>
                  )
                )}

                {modoUbicacion === 'gps_puntual' && ubicacionGpsPuntual && (
                  <div style={{ padding: '0.5rem', backgroundColor: '#e7f5ff', borderRadius: '4px', fontSize: '0.9rem', color: '#1864ab' }}>
                    📍 <strong>Ubicación GPS detectada:</strong> Lat: {ubicacionGpsPuntual.latitud.toFixed(5)}, Long: {ubicacionGpsPuntual.longitud.toFixed(5)}
                  </div>
                )}
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
              disabled={isSubmitting || loadingCotizacion || Boolean(errorCotizacion)}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.8rem',
                backgroundColor: isSubmitting || loadingCotizacion || Boolean(errorCotizacion) ? '#ccc' : '#2b8a3e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: isSubmitting || loadingCotizacion || Boolean(errorCotizacion) ? 'not-allowed' : 'pointer'
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