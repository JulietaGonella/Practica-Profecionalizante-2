import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPedidoAsignado,
  simularRecorridoPedido,
  entregarPedido,
  liberarPedidoRepartidor,
  confirmarRetiroLocal
} from '../../api/repartidorService';

/* Función auxiliar para limpiar números e integrar el código de país */
const formatearTelefonoWA = (telefono) => {
  if (!telefono) return '';
  const numLimpio = telefono.replace(/\D/g, '');
  return numLimpio.startsWith('54') ? numLimpio : `54${numLimpio}`;
};

export const DetallePedidoRepartidor = () => {
  const { ordenId } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actualizandoUbicacion, setActualizandoUbicacion] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [accionProcesando, setAccionProcesando] = useState('');

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
      setActualizandoUbicacion(true);
      const data = await getPedidoAsignado(ordenId);
      setPedido(data);
    } catch (err) {
      console.error('Error actualizando ubicación:', err);
    } finally {
      setActualizandoUbicacion(false);
    }
  };

  useEffect(() => {
    cargarPedido();
    const intervalo = setInterval(actualizarPedido, 3000);
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

  // Confirmar Retiro en un Local Específico
  const handleConfirmarRetiro = async (idLocal, nombreLocal) => {
    try {
      setAccionProcesando(`retiro_${idLocal}`);

      await confirmarRetiroLocal(Number(ordenId), { IDlocal: idLocal });

      alert(`✅ Retiro confirmado correctamente en ${nombreLocal}.`);
      await cargarPedido();
    } catch (err) {
      alert(
        err.response?.data?.error ||
        `No se pudo confirmar el retiro en ${nombreLocal}.`
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

  // Mapear locales involucrados junto con su estado de retiro
  const localesInvolucrados = Array.from(
    new Map(
      pedido?.productos
        ?.filter((p) => p.local)
        ?.map((p) => {
          const idLocal = p.IDlocal || p.local;

          const yaRetirado =
            pedido?.localesRuta?.find((l) => Number(l.IDlocal) === Number(idLocal))?.retirado === 1 ||
            pedido?.retiros_realizados?.includes(idLocal) ||
            p.retirado === true;

          return [
            idLocal,
            {
              id: idLocal,
              nombre: p.local,
              telefono: p.telefono_local,
              direccion: p.direccion_local,
              retirado: Boolean(yaRetirado)
            }
          ];
        })
    ).values()
  );

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

  // EVALUACIÓN DE ESTADO GLOBAL
  const estadoGlobalId = Number(pedido.IDestado);

  const todosLocalesRetirados = localesInvolucrados.length === 0 || localesInvolucrados.every((l) => l.retirado);

  // Únicamente el estado 5 (En camino) o 8 (Retirado en Local) deben contar como recorrido en curso
  const estaEnCamino = [5, 8].includes(estadoGlobalId);

  // Estado finalizado o cancelado (3: Entregado, 6: Cancelado)
  const estaFinalizado = [3, 6].includes(estadoGlobalId);

  // Solo se muestran "Iniciar" y "Rechazar" si el recorrido NO ha comenzado y no ha finalizado
  const puedeIniciarRecorrido = !estaEnCamino && !estaFinalizado;
  const puedeLiberar = !estaEnCamino && !estaFinalizado;

  // Muestra el campo de OTP solo cuando la orden YA está en camino/en curso y no ha finalizado
  const puedeEntregar = estaEnCamino && !estaFinalizado;

  // Mensaje auxiliar si el recorrido está en curso pero faltan locales por retirar
  const enEsperadeRetiro = estaEnCamino && !todosLocalesRetirados;

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '2rem auto',
        padding: '1rem'
      }}
    >
      <button
        onClick={() => navigate('/repartidor/inicio')}
        style={{
          marginBottom: '1rem',
          padding: '0.6rem 1rem',
          cursor: 'pointer'
        }}
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
        {/* CABECERA CON ESTADO GLOBAL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#6c757d' }}>
              Detalle del pedido
            </p>
            <h2 style={{ margin: '0.3rem 0' }}>
              Pedido #{pedido.IDorden}
            </h2>
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

        {/* 📍 SECCIÓN: DATOS DE ENTREGA Y LOCALES */}
        <section
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <h3 style={{ marginTop: 0 }}>📍 Datos de entrega y locales</h3>

          <p>
            <strong>Dirección del cliente:</strong>{' '}
            {pedido.direccion_cliente || 'No informada'}
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

          <h4 style={{ margin: '1rem 0 0.5rem' }}>🏪 Locales involucrados ({localesInvolucrados.length}):</h4>

          {localesInvolucrados.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {localesInvolucrados.map((local, index) => (
                <div
                  key={local.id || index}
                  style={{
                    padding: '0.8rem',
                    backgroundColor: local.retirado ? '#e6fcf5' : '#fff',
                    border: local.retirado ? '1px solid #20c997' : '1px solid #dee2e6',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ margin: 0 }}>
                      <strong>Local:</strong> {local.nombre}
                    </p>
                    {local.retirado && (
                      <span style={{ color: '#0ca678', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        ✅ Paquete Retirado
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
                      <button
                        onClick={() => handleConfirmarRetiro(local.id, local.nombre)}
                        disabled={accionProcesando === `retiro_${local.id}`}
                        style={{
                          marginLeft: 'auto',
                          padding: '0.4rem 0.8rem',
                          backgroundColor: accionProcesando === `retiro_${local.id}` ? '#868e96' : '#fd7e14',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          cursor: accionProcesando === `retiro_${local.id}` ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {accionProcesando === `retiro_${local.id}`
                          ? '⏳ Confirmando...'
                          : '📦 Confirmar retiro en este local'}
                      </button>
                    ) : (
                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#0ca678', fontWeight: 'bold' }}>
                        ✓ Retirado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0 }}>No hay información de locales disponibles.</p>
          )}
        </section>

        {/* 🛑 MENSAJE DE PAUSA SOLO DURANTE LA SIMULACIÓN SI FALTA RETIRAR EN LOCALES */}
        {enEsperadeRetiro && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffe8cc',
              borderRadius: '8px',
              color: '#856404',
              marginBottom: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            🛑 Simulación pausada: Llegaste al local. Debes confirmar el retiro de los productos para continuar con el recorrido.
          </div>
        )}

        {/* 🚴 SECCIÓN: SEGUIMIENTO DEL RECORRIDO */}
        <section
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <h3>🚴 Seguimiento del recorrido</h3>

          <p>
            <strong>Estado del pedido:</strong> {pedido.estado_orden || 'Sin estado'}
          </p>

          <p>
            <strong>Ubicación actual del repartidor:</strong>
          </p>

          {pedido.repartidor_latitud != null && pedido.repartidor_longitud != null ? (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#e7f5ff',
                borderRadius: '8px',
                color: '#1864ab',
                fontFamily: 'monospace'
              }}
            >
              📍 Latitud: {Number(pedido.repartidor_latitud).toFixed(6)}
              <br />
              📍 Longitud: {Number(pedido.repartidor_longitud).toFixed(6)}
              <br />
              🕒 Última actualización:{' '}
              {pedido.repartidor_ultima_ubicacion
                ? new Date(pedido.repartidor_ultima_ubicacion).toLocaleTimeString()
                : 'Sin información'}
            </div>
          ) : (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                color: '#856404'
              }}
            >
              ⏳ El recorrido todavía no comenzó.
            </div>
          )}

          {actualizandoUbicacion && (
            <p style={{ color: '#6c757d', fontSize: '0.85rem' }}>
              🔄 Actualizando ubicación...
            </p>
          )}
        </section>

        {/* 📦 SECCIÓN PRODUCTOS CON ESTADO INDIVIDUAL */}
        <section>
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

                      {/* Insignia visual del estado individual del producto */}
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

        {/* ACCIONES DEL REPARTIDOR */}
        <section
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #eee'
          }}
        >
          {/* Se muestran 'Iniciar' y 'Rechazar' solo antes de iniciar el recorrido */}
          {(puedeIniciarRecorrido || puedeLiberar) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {puedeIniciarRecorrido && (
                <button
                  onClick={handleSimularRecorrido}
                  disabled={accionProcesando !== ''}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    backgroundColor:
                      accionProcesando === 'recorrido'
                        ? '#868e96'
                        : '#1c7ed6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: accionProcesando !== '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {accionProcesando === 'recorrido'
                    ? '⏳ Iniciando recorrido...'
                    : '🚴 Iniciar recorrido simulado'}
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
                  {accionProcesando === 'liberar'
                    ? '⏳ Liberando pedido...'
                    : '❌ Rechazar / Liberar viaje'}
                </button>
              )}
            </div>
          )}

          {/* Se muestra la confirmación por OTP una vez que el recorrido ya inició */}
          {puedeEntregar && (
            <div>
              <h3>✅ Confirmar entrega</h3>

              <p style={{ color: '#666' }}>
                Ingresá el código OTP proporcionado por el cliente.
              </p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Código OTP"
                maxLength={8}
                disabled={accionProcesando !== ''}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '1px solid #ced4da',
                  borderRadius: '8px',
                  marginBottom: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />

              <button
                onClick={handleEntregar}
                disabled={accionProcesando !== ''}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  backgroundColor:
                    accionProcesando === 'entrega'
                      ? '#868e96'
                      : '#2b8a3e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: accionProcesando !== ''
                    ? 'not-allowed'
                    : 'pointer'
                }}
              >
                {accionProcesando === 'entrega'
                  ? '⏳ Confirmando entrega...'
                  : '✅ Entregar pedido'}
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
      </div>
    </div>
  );
};