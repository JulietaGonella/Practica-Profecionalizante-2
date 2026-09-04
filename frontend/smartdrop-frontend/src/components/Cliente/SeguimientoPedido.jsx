import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getPedidoById } from '../../api/ordersService';
import api from '../../api/axios';
import { obtenerEstadoEfectivoCliente, SECUENCIA_ESTADOS } from '../../utils/estados';

export const SeguimientoPedido = () => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

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

  useEffect(() => {
    if (ordenId) {
      cargarPedido();
      const interval = setInterval(cargarPedido, 10000);
      return () => clearInterval(interval);
    }
  }, [ordenId]);

  if (loading) return <div style={{ padding: '2rem' }}>⏳ Cargando estado del pedido...</div>;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#e03131' }}>
        ⚠️ {error}
      </div>
    );
  }

  // 1. Obtener lista completa de productos
  const listaProductos = orden.productos || orden.detalles || [];

  // 2. Filtrar solo productos activos (no cancelados / IDestado !== 6)
  const productosActivos = listaProductos.filter((p) => {
    const estadoId = p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado;
    return Number(estadoId) !== 6;
  });

  // 3. Estado General Calculado
  const idEstadoEfectivo = obtenerEstadoEfectivoCliente(orden);
  const estadoGeneralConfig = SECUENCIA_ESTADOS[idEstadoEfectivo] || {
    bg: '#eee',
    color: '#000',
    etiqueta: orden.estado_orden || 'En proceso'
  };

  // 4. Resumen del pedido (Tomando los valores recalculated recibidos desde la BD/Backend)
  const subtotal = Number(orden.subtotal ?? orden.precio ?? 0);
  const costoEnvio = Number(orden.costo_envio ?? orden.envio ?? 0);
  const totalPedido = Number(orden.total ?? subtotal + costoEnvio);
  const metodoPago = orden.metodo_pago || orden.forma_pago || orden.medio_pago || 'No informado';

  // --- Evaluación del Método de Pago ---
  const metodoPagoTexto = metodoPago.toLowerCase();
  const idMetodoPago = Number(orden.IDmetodo_pago ?? 1);
  const esEfectivo = idMetodoPago === 1 || metodoPagoTexto.includes('efectivo');

  // --- Normalización del Estado de Pago ---
  const rawEstadoPago = (orden.estado_pago || paymentStatusParam || 'pendiente').toLowerCase();

  let estadoPagoNormalizado = 'pendiente';
  if (['aprobado', 'approved'].includes(rawEstadoPago)) {
    estadoPagoNormalizado = 'aprobado';
  } else if (['rechazado', 'rejected', 'cancelled'].includes(rawEstadoPago)) {
    estadoPagoNormalizado = 'rechazado';
  }

  const configBadgePago = {
    aprobado: { bg: '#d3f9d8', color: '#2b8a3e', texto: 'PAGO APROBADO' },
    pendiente: { bg: '#fff3bf', color: '#e67700', texto: 'PAGO PENDIENTE' },
    rechazado: { bg: '#ffe3e3', color: '#c92a2a', texto: 'PAGO RECHAZADO' }
  };

  const currentBadge = configBadgePago[estadoPagoNormalizado];

  // 5. Evaluar si todos los ítems ACTIVOS coinciden en el mismo estado
  const estadosItemsActivos = productosActivos.map(
    (p) => p.IDestado_item ?? p.IDestado_detalle ?? p.IDestado ?? orden.IDestado
  );
  const estanTodosMismoEstado =
    estadosItemsActivos.length > 0 &&
    estadosItemsActivos.every((st) => st === estadosItemsActivos[0]);

  return (
    <div style={{ maxWidth: '800px', margin: '1.5rem auto', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2>📦 Seguimiento del Pedido #{orden.IDorden || ordenId}</h2>

      {/* Alertas según el estado del pago */}
      {!esEfectivo && estadoPagoNormalizado === 'aprobado' && (
        <div style={{ backgroundColor: '#d3f9d8', color: '#2b8a3e', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>
          🎉 ¡Pago aprobado con éxito! Tu pedido ha sido enviado al local para su preparación.
        </div>
      )}

      {esEfectivo && (
        <div style={{ backgroundColor: '#e7f5ff', color: '#1864ab', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>
          💵 Pago en efectivo: Abonarás en el punto de entrega directamente al repartidor al recibir tu compra.
        </div>
      )}

      {!esEfectivo && estadoPagoNormalizado === 'pendiente' && (
        <div style={{ backgroundColor: '#fff3bf', color: '#e67700', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>
          ⏳ Tu pago está en proceso de revisión por parte de la pasarela. Te avisaremos apenas sea acreditado.
        </div>
      )}

      {/* MODO DEMO: Botón de Simulación de Pago */}
      {!esEfectivo && estadoPagoNormalizado === 'pendiente' && (
        <div style={{ margin: '1rem 0', padding: '1rem', border: '1px dashed #2b8a3e', borderRadius: '8px', backgroundColor: '#ebfbee', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#2b8a3e' }}>
            🧪 Modo Demo Activo (Pasarela Online):
          </p>
          <button 
            disabled={isSimulating}
            onClick={async () => {
              setIsSimulating(true);
              try {
                await api.post(`/orders/${ordenId}/simular-pago`);
                await cargarPedido();
              } catch (error) {
                alert(error.response?.data?.error || 'Error al simular el pago');
              } finally {
                setIsSimulating(false);
              }
            }}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: isSimulating ? '#a5d8ff' : '#2b8a3e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isSimulating ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isSimulating ? '⏳ Procesando pago...' : '✅ Simular Pago Exitoso (Mercado Pago)'}
          </button>
        </div>
      )}

      {!esEfectivo && estadoPagoNormalizado === 'rechazado' && (
        <div style={{ backgroundColor: '#ffe3e3', color: '#c92a2a', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>
          ⚠️ La transacción del pago ha fallado o fue rechazada. Por favor, intenta realizar la compra con otro medio de pago.
        </div>
      )}

      {/* Estado General de la Orden */}
      <div
        style={{
          padding: '1.2rem',
          backgroundColor: estadoGeneralConfig.bg,
          color: estadoGeneralConfig.color,
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}
      >
        Estado General: {estadoGeneralConfig.etiqueta}
      </div>

      {/* 🔴 NUEVO: Alerta y Motivo cuando la orden general está CANCELADA (Cancelada por Cliente o Todos Rechazados) */}
      {Number(orden.IDestado) === 6 && (
        <div style={{ 
          backgroundColor: '#ffe3e3', 
          border: '1px solid #ffc9c9', 
          color: '#c92a2a', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem', 
          textAlign: 'center' 
        }}>
          <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem' }}>🚫 Pedido Cancelado</h3>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            <strong>Motivo:</strong> {orden.motivo_cancelacion || 'El pedido fue cancelado.'}
          </p>
        </div>
      )}

      {/* Ubicación de Entrega */}
      <div style={{ backgroundColor: '#e7f5ff', border: '1px solid #a5d8ff', borderRadius: '8px', padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.4rem 0', color: '#1864ab' }}>📍 Ubicación de Entrega</h4>
        <p style={{ margin: 0, color: '#343a40', fontWeight: '500' }}>
          {orden.direccion_entrega || 'Dirección no especificada'}
        </p>
      </div>

      {/* Resumen del pedido recalculado */}
      <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.8rem 0' }}>💳 Resumen del Pedido</h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: '0.5rem', columnGap: '1rem' }}>
          <span>Subtotal</span>
          <strong>$ {subtotal.toFixed(2)}</strong>

          <span>Envío</span>
          <strong>$ {costoEnvio.toFixed(2)}</strong>

          <span>Total a pagar</span>
          <strong style={{ fontSize: '1.05rem', color: '#1c7ed6' }}>$ {totalPedido.toFixed(2)}</strong>
        </div>

        <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid #eee' }}>
          <p style={{ margin: 0, color: '#495057', fontSize: '0.9rem' }}>
            <strong>Método de pago:</strong> {metodoPago}
          </p>

          {!esEfectivo && (
            <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#495057' }}>Estado del pago:</strong>
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
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

      {/* Mensaje descriptivo si los productos ACTIVOS tienen estados diferentes */}
      {!estanTodosMismoEstado && productosActivos.length > 0 && (
        <div style={{ backgroundColor: '#e7f5ff', color: '#1864ab', padding: '0.8rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem', borderLeft: '4px solid #339af0' }}>
          ℹ️ Los productos de tu pedido se encuentran en diferentes etapas de preparación/despacho. El estado general se actualizará a la siguiente fase cuando todos los locales/productos coincidan en el mismo estado.
        </div>
      )}

      {/* Código OTP para entrega */}
      {orden.codigo_otp && (
        <div style={{ border: '2px dashed #007bff', padding: '1rem', textAlign: 'center', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>Muestra este código al repartidor para recibir tu pedido:</p>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#007bff' }}>{orden.codigo_otp}</span>
        </div>
      )}

      {/* Desglose individual de estados por Producto */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', marginTop: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem 0' }}>📋 Estado Individual por Producto</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {listaProductos.map((prod, idx) => {
            const estadoIdProd = Number(prod.IDestado_item ?? prod.IDestado_detalle ?? prod.IDestado ?? orden.IDestado);
            const esCancelado = estadoIdProd === 6;

            const configItem = SECUENCIA_ESTADOS[estadoIdProd] || {
              bg: esCancelado ? '#ffe3e3' : '#e9ecef',
              color: esCancelado ? '#c92a2a' : '#495057',
              etiqueta: esCancelado ? 'Cancelado / Rechazado' : (prod.estado_item || 'Pendiente')
            };

            // 🔍 Capturar el motivo del detalle o el general de la orden como fallback
            const motivoRechazoItem = prod.motivo_rechazo || prod.motivo_cancelacion || orden.motivo_cancelacion;

            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.8rem 1rem',
                  backgroundColor: esCancelado ? '#fff5f5' : '#fff',
                  border: `1px solid ${esCancelado ? '#ffc9c9' : '#dee2e6'}`,
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '10px',
                  opacity: esCancelado ? 0.85 : 1
                }}
              >
                <div style={{ flex: '1 1 250px' }}>
                  <div style={{ fontWeight: '600', textDecoration: esCancelado ? 'line-through' : 'none', color: esCancelado ? '#868e96' : '#212529' }}>
                    {prod.cantidad}x {prod.producto || prod.nombre}
                  </div>

                  {/* Opciones del Producto */}
                  {prod.opciones && prod.opciones.length > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.2rem' }}>
                      <strong>Opciones:</strong>{' '}
                      {prod.opciones
                        .map((o) => {
                          const cant = o.cantidad || 1;
                          const cantStr = cant > 1 ? `${cant}x ` : '';
                          const precioUnit = Number(o.precio_adicional || 0);

                          let precioStr = '';
                          if (precioUnit > 0) {
                            precioStr = cant > 1 
                              ? ` (+$${precioUnit.toFixed(2)} c/u = +$${(precioUnit * cant).toFixed(2)})`
                              : ` (+$${precioUnit.toFixed(2)})`;
                          }

                          return `${cantStr}${o.nombre}${precioStr}`;
                        })
                        .join(', ')}
                    </div>
                  )}

                  {prod.local && (
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.1rem' }}>
                      🏪 Local: {prod.local}
                    </div>
                  )}

                  {/* ⚠️ Muestra explícita del motivo de rechazo/cancelación individual */}
                  {esCancelado && motivoRechazoItem && (
                    <div style={{ fontSize: '0.85rem', color: '#e03131', marginTop: '0.4rem', fontWeight: '500' }}>
                      ⚠️ <strong>Motivo de rechazo/cancelación:</strong> {motivoRechazoItem}
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '0.3rem 0.8rem',
                  backgroundColor: configItem.bg,
                  color: configItem.color,
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}>
                  {configItem.etiqueta}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};