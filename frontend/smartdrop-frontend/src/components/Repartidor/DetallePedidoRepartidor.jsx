import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPedidoAsignado,
  simularRecorridoPedido,
  entregarPedido
} from '../../api/repartidorService';

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

      alert('La simulación del recorrido comenzó correctamente.');
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

  const estadoId = Number(pedido.IDestado);

  // Puede iniciar recorrido si está Asignado (4) o Listo para retirar (7)
  const puedeIniciarRecorrido = estadoId === 4 || estadoId === 7;
  const puedeEntregar = estadoId === 5;

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
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
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
              backgroundColor:
                estadoId === 5 ? '#ffe8cc' : '#d0ebff',
              color:
                estadoId === 5 ? '#d9480f' : '#1864ab',
              fontWeight: 'bold'
            }}
          >
            {pedido.estado_orden || 'Sin estado'}
          </span>
        </div>

        <section
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <h3 style={{ marginTop: 0 }}>📍 Datos de entrega</h3>

          <p>
            <strong>Dirección del cliente:</strong>{' '}
            {pedido.direccion_cliente || 'No informada'}
          </p>

          <p>
            <strong>Repartidor asignado:</strong>{' '}
            #{pedido.IDrepartidor}
          </p>

          <p style={{ marginBottom: 0 }}>
            <strong>Total:</strong>{' '}
            $ {Number(pedido.total || 0).toFixed(2)}
          </p>
        </section>

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
            <strong>Estado:</strong>{' '}
            {pedido.estado_orden || 'Sin estado'}
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

          {/* Banner con los estados 5, 7 y 4 */}
          {(estadoId === 5 || estadoId === 7 || estadoId === 4) && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.8rem',
                backgroundColor: estadoId === 5 ? '#ffe8cc' : '#e7f5ff',
                color: estadoId === 5 ? '#d9480f' : '#1864ab',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              {estadoId === 5 
                ? '🚴 El repartidor está realizando el recorrido en camino.' 
                : '📦 Pedido en gestión de retiro / asignado.'}
            </div>
          )}
        </section>

        <section>
          <h3>📦 Productos del pedido</h3>

          {pedido.productos?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pedido.productos.map((producto) => {
                const esCancelado = Number(producto.IDestado_detalle || producto.IDestado_item) === 6;

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

                      {esCancelado && (
                        <span style={{ color: '#e03131', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ❌ CANCELADO
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0.3rem 0', color: '#555' }}>
                      Local: {producto.local || 'No informado'}
                    </p>

                    <p style={{ margin: 0, color: esCancelado ? '#e03131' : '#555' }}>
                      Estado: {producto.estado_detalle || 'Sin estado'}
                    </p>

                    {producto.motivo_rechazo && (
                      <p style={{ margin: '0.3rem 0 0', color: '#e03131', fontSize: '0.9rem' }}>
                        <strong>Motivo de rechazo:</strong> {producto.motivo_rechazo}
                      </p>
                    )}

                    {producto.comentario && (
                      <p style={{ margin: '0.3rem 0 0', color: '#d9480f', fontStyle: 'italic' }}>
                        💬 Nota: {producto.comentario}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No hay productos asociados.</p>
          )}
        </section>

        <section
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #eee'
          }}
        >
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
                cursor: accionProcesando !== ''
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              {accionProcesando === 'recorrido'
                ? '⏳ Iniciando recorrido...'
                : '🚴 Iniciar recorrido simulado'}
            </button>
          )}

          {puedeEntregar && (
            <>
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
            </>
          )}

          {estadoId === 3 && (
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