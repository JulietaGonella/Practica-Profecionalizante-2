// src/components/Cliente/MisPedidos.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMisPedidos, cancelarPedido, calificarPedido } from '../../api/ordersService';
import { getLocalById } from '../../api/localService';
import { useCart } from '../../context/CartContext';
import { ESTADOS_ORDEN } from '../../utils/estados';
import { estaLocalAbierto } from '../../utils/horarios';
import './CSS/Cliente.css'; // 👈 Importación de los estilos unificados

export const MisPedidos = () => {
  const navigate = useNavigate();
  const { reordenarPedido } = useCart();

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reorderingId, setReorderingId] = useState(null);
  const [mensajeBanner, setMensajeBanner] = useState('');

  // Estado para el Modal Estético de Avisos unificado
  const [modalAviso, setModalAviso] = useState(null);

  // Estados para el Modal de Cancelación
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Estados para el Modal de Calificación
  const [modalOrden, setModalOrden] = useState(null);
  const [puntaje, setPuntaje] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  const cargarPedidos = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await getMisPedidos();
      setPedidos(data);
      setError('');
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      if (!isSilent) setError('No se pudieron obtener tus pedidos.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    const interval = setInterval(() => {
      cargarPedidos(true);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePedirDeNuevo = async (orden) => {
    if (!orden.productos || orden.productos.length === 0) return;

    setReorderingId(orden.IDorden);
    setMensajeBanner('');

    try {
      const idsLocales = [
        ...new Set(
          orden.productos
            .map((p) => p.IDlocal ?? p.id_local ?? p.localId)
            .filter(Boolean)
        )
      ];

      const localesCerrados = [];

      for (const localId of idsLocales) {
        try {
          const localInfo = await getLocalById(localId);
          if (!localInfo || !estaLocalAbierto(localInfo, localInfo.horarios)) {
            localesCerrados.push(localInfo?.nombre || `Local #${localId}`);
          }
        } catch (err) {
          console.error(`Error al consultar local ${localId}:`, err);
          localesCerrados.push(`Local #${localId}`);
        }
      }

      if (localesCerrados.length > 0) {
        const textoDetalle = localesCerrados.length === 1
          ? `El local "${localesCerrados[0]}" se encuentra cerrado actualmente.`
          : `Los siguientes locales están cerrados:\n- ${localesCerrados.join('\n- ')}`;

        setModalAviso({
          titulo: '⚠️ No se puede reordenar',
          mensaje: textoDetalle
        });
        setReorderingId(null);
        return;
      }

      const productosDisponibles = orden.productos.filter(
        (p) => Number(p.IDestado_item) !== ESTADOS_ORDEN.CANCELADO
      );

      if (productosDisponibles.length === 0) {
        setModalAviso({
          titulo: '⚠️ No se puede reordenar',
          mensaje: 'Todos los productos de este pedido fueron cancelados.'
        });
        setReorderingId(null);
        return;
      }

      reordenarPedido(productosDisponibles);
      navigate('/cliente/carrito');
    } catch (err) {
      console.error('Error al intentar reordenar pedido:', err);
      setModalAviso({
        titulo: '⚠️ Error de sistema',
        mensaje: 'Ocurrió un error al verificar la disponibilidad de los locales.'
      });
    } finally {
      setReorderingId(null);
    }
  };

  const handleConfirmarCancelar = async () => {
    if (!motivoCancelacion.trim()) {
      setModalAviso({
        titulo: '⚠️ Motivo requerido',
        mensaje: 'Debes ingresar un motivo para cancelar el pedido.'
      });
      return;
    }

    setSubmittingCancel(true);
    setMensajeBanner('');

    try {
      await cancelarPedido(cancellingOrder.IDorden, motivoCancelacion);
      setCancellingOrder(null);
      setMotivoCancelacion('');
      setModalAviso({
        titulo: '✓ Pedido Cancelado',
        mensaje: 'El pedido fue cancelado exitosamente.'
      });
      cargarPedidos();
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error al cancelar',
        mensaje: err.response?.data?.error || 'Ocurrió un error al intentar cancelar el pedido.'
      });
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleAbrirCalificacion = (orden) => {
    setModalOrden(orden);
    setPuntaje(orden.puntaje_cliente || 5);
  };

  const handleEnviarCalificacion = async () => {
    if (!modalOrden) return;
    setSubmittingRating(true);
    setMensajeBanner('');

    try {
      await calificarPedido(modalOrden.IDorden, puntaje);
      setMensajeBanner('⭐ ¡Gracias por calificar tu pedido!');
      setModalOrden(null);
      cargarPedidos();
    } catch (err) {
      setMensajeBanner(err.response?.data?.error || '⚠️ Error al guardar la calificación.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="sd-state">
        <div className="sd-spinner"></div>
        <p>Cargando tus pedidos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sd-state sd-state--error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="sd-orders-container">
      <div className="admin-page-head" style={{ marginBottom: 0 }}>
        <h2 className="admin-section-title" style={{ margin: 0 }}>📦 Mis Pedidos</h2>
      </div>

      {mensajeBanner && (
        <div className="admin-banner admin-banner--success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{mensajeBanner}</span>
          <button onClick={() => setMensajeBanner('')} className="admin-btn admin-btn--ghost admin-btn--sm">✕</button>
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="sd-state">
          <p className="admin-muted">Aún no has realizado ningún pedido.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {pedidos.map((orden) => {
            const estadoId = Number(orden.IDestado);
            const esEntregado = estadoId === ESTADOS_ORDEN.ENTREGADO;
            const esCancelado = estadoId === ESTADOS_ORDEN.CANCELADO;

            let badgeClass = 'admin-badge admin-badge--warning';
            if (esEntregado) badgeClass = 'admin-badge admin-badge--success';
            if (esCancelado) badgeClass = 'admin-badge admin-badge--error';

            return (
              <div key={orden.IDorden} className="sd-order-card">
                <div className="sd-order-card__head">
                  <h3 className="sd-order-card__title">Pedido #{orden.IDorden}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(orden.repartidor_asignado || orden.IDrepartidor) &&
                      !esEntregado &&
                      !esCancelado &&
                      estadoId !== ESTADOS_ORDEN.REPARTIDOR_ASIGNADO && (
                        <span className="admin-badge admin-badge--info">
                          🚴 Repartidor Asignado
                        </span>
                      )}
                    <span className={badgeClass}>
                      {orden.estado_orden}
                    </span>
                  </div>
                </div>

                <div className="sd-order-card__meta">
                  <p>
                    <strong>Total:</strong> ${Number(orden.total).toFixed(2)}{' '}
                    <span className="admin-muted">
                      (Subtotal: ${Number(orden.subtotal).toFixed(2)} + Envío: ${Number(orden.costo_envio).toFixed(2)})
                    </span>
                  </p>
                  {orden.codigo_otp && (
                    <p>
                      <strong>Código OTP de Entrega:</strong> <code className="admin-mono" style={{ color: 'var(--sd-info)', fontSize: '1rem' }}>{orden.codigo_otp}</code>
                    </p>
                  )}
                  {orden.motivo_cancelacion && (
                    <p className="admin-text-error">
                      <strong>Motivo Cancelación:</strong> {orden.motivo_cancelacion}
                    </p>
                  )}
                  {orden.puntaje_cliente && (
                    <p style={{ color: 'var(--sd-warning)' }}>
                      <strong>Tu calificación:</strong> {'★'.repeat(orden.puntaje_cliente)}{'☆'.repeat(5 - orden.puntaje_cliente)} ({orden.puntaje_cliente}/5)
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="admin-subtitle" style={{ margin: '0 0 8px 0' }}>Productos:</h4>
                  <ul className="sd-order-items-list">
                    {orden.productos?.map((prod) => {
                      const isItemRechazado = Number(prod.IDestado_item) === ESTADOS_ORDEN.CANCELADO;

                      return (
                        <li
                          key={prod.IDdetalle}
                          className={`sd-order-item ${isItemRechazado ? 'sd-order-item--rejected' : ''}`}
                        >
                          <div className="sd-order-item__row">
                            <span style={{ textDecoration: isItemRechazado ? 'line-through' : 'none', color: isItemRechazado ? 'var(--sd-text-secondary)' : 'inherit' }}>
                              {prod.cantidad}x {prod.producto} ({prod.local}) - <strong>${Number(prod.precio_unitario).toFixed(2)} c/u</strong>
                            </span>

                            {isItemRechazado && (
                              <span className="admin-badge admin-badge--error">
                                ❌ {prod.estado_item || 'Rechazado'}
                              </span>
                            )}
                          </div>

                          {isItemRechazado && prod.motivo_rechazo && (
                            <p className="admin-text-error" style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 'bold' }}>
                              ⚠️ Motivo de rechazo del local: {prod.motivo_rechazo}
                            </p>
                          )}

                          {prod.opciones && prod.opciones.length > 0 && (
                            <div className="sd-order-item__options">
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

                          {prod.comentario && <p className="admin-muted" style={{ margin: 0, fontSize: '0.8125rem' }}>Nota: {prod.comentario}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="sd-order-actions">
                  {(esEntregado || esCancelado) && (
                    <button
                      onClick={() => handlePedirDeNuevo(orden)}
                      disabled={reorderingId === orden.IDorden}
                      className="admin-btn admin-btn--info-soft admin-btn--sm"
                    >
                      {reorderingId === orden.IDorden ? '⌛ Verificando...' : '🔄 Pedir de nuevo'}
                    </button>
                  )}

                  {!esEntregado && !esCancelado && (
                    <button
                      onClick={() => navigate(`/cliente/seguimiento/${orden.IDorden}`)}
                      className="admin-btn admin-btn--primary admin-btn--sm"
                    >
                      📍 Ver Seguimiento
                    </button>
                  )}

                  {estadoId === ESTADOS_ORDEN.CREADO && (
                    <button
                      onClick={() => setCancellingOrder(orden)}
                      className="admin-btn admin-btn--danger-soft admin-btn--sm"
                    >
                      ❌ Cancelar Pedido
                    </button>
                  )}

                  {esEntregado && (
                    <button
                      onClick={() => handleAbrirCalificacion(orden)}
                      className={`admin-btn admin-btn--sm ${orden.puntaje_cliente ? 'admin-btn--outline' : 'admin-btn--success'}`}
                    >
                      {orden.puntaje_cliente ? '✏️ Cambiar Calificación' : '⭐ Calificar Pedido'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Estético General de Avisos */}
      {modalAviso && (
        <div className="admin-modal-aviso-overlay">
          <div className="admin-modal-aviso-box">
            <div className="admin-modal-aviso-icon admin-modal-aviso-icon--warning">⚠️</div>
            <h3>{modalAviso.titulo}</h3>
            <p>{modalAviso.mensaje}</p>
            <div className="admin-modal-aviso-actions">
              <button
                onClick={() => {
                  setModalAviso(null);
                  if (modalAviso.titulo.includes('Cancelado')) {
                    setCancellingOrder(null);
                  }
                }}
                className="admin-btn admin-btn--primary"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelación */}
      {cancellingOrder && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: '420px' }}>
            <div className="admin-modal-head">
              <h3>Cancelar Pedido #{cancellingOrder.IDorden}</h3>
            </div>
            <p className="admin-muted" style={{ marginBottom: '16px' }}>Escribe la razón por la cual deseas cancelar tu pedido:</p>

            <div className="admin-field" style={{ marginBottom: '16px' }}>
              <textarea
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Motivo de la cancelación..."
                className="admin-textarea"
              />
            </div>

            <div className="admin-modal-foot">
              <button
                onClick={() => { setCancellingOrder(null); setMotivoCancelacion(''); }}
                className="admin-btn admin-btn--outline"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmarCancelar}
                disabled={submittingCancel}
                className="admin-btn admin-btn--danger"
              >
                {submittingCancel ? '⌛ Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calificación */}
      {modalOrden && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="admin-modal-head" style={{ justifyContent: 'center' }}>
              <h3>Calificar Pedido #{modalOrden.IDorden}</h3>
            </div>
            <p className="admin-muted">¿Cómo fue tu experiencia con este pedido?</p>

            <div style={{ margin: '1.5rem 0', fontSize: '2rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setPuntaje(star)}
                  style={{ color: star <= puntaje ? 'var(--sd-warning)' : '#ccc', padding: '0 0.2rem' }}
                >
                  ★
                </span>
              ))}
            </div>

            <p style={{ fontWeight: 'bold', color: 'var(--sd-navy)' }}>{puntaje} / 5 Estrellas</p>

            <div className="admin-modal-foot" style={{ justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setModalOrden(null)}
                className="admin-btn admin-btn--outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarCalificacion}
                disabled={submittingRating}
                className="admin-btn admin-btn--primary"
              >
                {submittingRating ? 'Guardando...' : 'Guardar Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};