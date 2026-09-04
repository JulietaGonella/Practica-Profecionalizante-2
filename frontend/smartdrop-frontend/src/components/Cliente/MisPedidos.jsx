// src/components/Cliente/MisPedidos.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMisPedidos, cancelarPedido, calificarPedido } from '../../api/ordersService';
import { getLocalById } from '../../api/localService';
import { useCart } from '../../context/CartContext';
import { ESTADOS_ORDEN } from '../../utils/estados';
import { estaLocalAbierto } from '../../utils/horarios';

export const MisPedidos = () => {
  const navigate = useNavigate();
  const { reordenarPedido } = useCart();

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reorderingId, setReorderingId] = useState(null);

  // Estados para el Modal de Cancelación
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Estados para el Modal de Calificación
  const [modalOrden, setModalOrden] = useState(null);
  const [puntaje, setPuntaje] = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  const cargarPedidos = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMisPedidos();
      setPedidos(data);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError('No se pudieron obtener tus pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  // 🔄 Handler para la funcionalidad "Pedir de nuevo" con soporte multilocal y validación individual
  const handlePedirDeNuevo = async (orden) => {
    if (!orden.productos || orden.productos.length === 0) return;

    setReorderingId(orden.IDorden);

    try {
      // 1. Extraer los IDs únicos de los locales involucrados en la orden
      const idsLocales = [
        ...new Set(
          orden.productos
            .map((p) => p.IDlocal ?? p.id_local ?? p.localId)
            .filter(Boolean)
        )
      ];

      // 2. Verificar disponibilidad y horario de cada uno de los locales
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

      // 3. Si hay uno o más locales cerrados, detener la acción e informar al usuario
      if (localesCerrados.length > 0) {
        if (localesCerrados.length === 1) {
          alert(`No se puede reordenar: El local "${localesCerrados[0]}" se encuentra cerrado o fuera de servicio actualmente.`);
        } else {
          alert(`No se puede reordenar: Los siguientes locales están cerrados o fuera de servicio actualmente:\n- ${localesCerrados.join('\n- ')}`);
        }
        return;
      }

      // 4. Filtrar únicamente los productos que NO hayan sido rechazados/cancelados
      const productosDisponibles = orden.productos.filter(
        (p) => Number(p.IDestado_item) !== ESTADOS_ORDEN.CANCELADO
      );

      if (productosDisponibles.length === 0) {
        alert('No se puede reordenar: Todos los productos de este pedido fueron cancelados.');
        return;
      }

      reordenarPedido(productosDisponibles);
      navigate('/cliente/carrito');
    } catch (err) {
      console.error('Error al intentar reordenar pedido:', err);
      alert('Ocurrió un error al verificar la disponibilidad de los locales.');
    } finally {
      setReorderingId(null);
    }
  };

  // Manejo de la cancelación desde el modal
  const handleConfirmarCancelar = async () => {
    if (!motivoCancelacion.trim()) {
      alert('Debes ingresar un motivo');
      return;
    }

    setSubmittingCancel(true);

    try {
      await cancelarPedido(cancellingOrder.IDorden, motivoCancelacion);
      alert('Pedido cancelado exitosamente');
      setCancellingOrder(null);
      setMotivoCancelacion('');
      cargarPedidos();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cancelar el pedido');
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

    try {
      await calificarPedido(modalOrden.IDorden, puntaje);
      alert('¡Gracias por calificar tu pedido!');
      setModalOrden(null);
      cargarPedidos();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar la calificación');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) return <div>⏳ Cargando tus pedidos...</div>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>📦 Mis Pedidos</h2>
      </div>

      {pedidos.length === 0 ? (
        <p>Aún no has realizado ningún pedido.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pedidos.map((orden) => {
            const estadoId = Number(orden.IDestado);

            return (
              <div
                key={orden.IDorden}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Pedido #{orden.IDorden}</h3>
                  <span style={{
                    fontWeight: 'bold',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    backgroundColor: estadoId === ESTADOS_ORDEN.ENTREGADO ? '#d4edda' : estadoId === ESTADOS_ORDEN.CANCELADO ? '#f8d7da' : '#fff3cd',
                    color: estadoId === ESTADOS_ORDEN.ENTREGADO ? '#155724' : estadoId === ESTADOS_ORDEN.CANCELADO ? '#721c24' : '#856404'
                  }}>
                    {orden.estado_orden}
                  </span>
                </div>

                <p><strong>Total:</strong> ${Number(orden.total).toFixed(2)} (Subtotal: ${Number(orden.subtotal).toFixed(2)} + Envío: ${Number(orden.costo_envio).toFixed(2)})</p>
                {orden.codigo_otp && <p><strong>Código OTP de Entrega:</strong> <code style={{ fontSize: '1.1rem', color: '#1c7ed6' }}>{orden.codigo_otp}</code></p>}
                {orden.motivo_cancelacion && <p style={{ color: 'red' }}><strong>Motivo Cancelación:</strong> {orden.motivo_cancelacion}</p>}
                {orden.puntaje_cliente && <p style={{ color: '#f39c12' }}><strong>Tu calificación:</strong> {'★'.repeat(orden.puntaje_cliente)}{'☆'.repeat(5 - orden.puntaje_cliente)} ({orden.puntaje_cliente}/5)</p>}

                <h4>Productos:</h4>
                <ul style={{ paddingLeft: '1.2rem', listStyleType: 'none' }}>
                  {orden.productos?.map((prod) => {
                    const isItemRechazado = Number(prod.IDestado_item) === ESTADOS_ORDEN.CANCELADO;

                    return (
                      <li
                        key={prod.IDdetalle}
                        style={{
                          marginBottom: '0.8rem',
                          padding: '0.6rem',
                          borderRadius: '6px',
                          backgroundColor: isItemRechazado ? '#fff5f5' : 'transparent',
                          borderLeft: isItemRechazado ? '4px solid #dc3545' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ textDecoration: isItemRechazado ? 'line-through' : 'none', color: isItemRechazado ? '#6c757d' : '#000' }}>
                            {prod.cantidad}x {prod.producto} ({prod.local}) - <strong>${Number(prod.precio_unitario).toFixed(2)} c/u</strong>
                          </span>

                          {/* Estado individual del producto en caso de rechazo/cancelación */}
                          {isItemRechazado && (
                            <span style={{ backgroundColor: '#f8d7da', color: '#721c24', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                              ❌ {prod.estado_item || 'Rechazado'}
                            </span>
                          )}
                        </div>

                        {/* Motivo de rechazo específico del ítem proporcionado por el local */}
                        {isItemRechazado && prod.motivo_rechazo && (
                          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#dc3545', fontWeight: 'bold' }}>
                            ⚠️ Motivo de rechazo del local: {prod.motivo_rechazo}
                          </p>
                        )}

                        {/* Visualización de Opciones con Cantidad y Subtotal Explícito */}
                        {prod.opciones && prod.opciones.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.2rem' }}>
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

                        {prod.comentario && <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Nota: {prod.comentario}</p>}
                      </li>
                    );
                  })}
                </ul>

                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', flexWrap: 'wrap' }}>

                  {/* 🔄 BOTÓN PEDIR DE NUEVO: Solo si el pedido está ENTREGADO o CANCELADO */}
                  {(estadoId === ESTADOS_ORDEN.ENTREGADO || estadoId === ESTADOS_ORDEN.CANCELADO) && (
                    <button
                      onClick={() => handlePedirDeNuevo(orden)}
                      disabled={reorderingId === orden.IDorden}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: reorderingId === orden.IDorden ? '#6c757d' : '#17a2b8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: reorderingId === orden.IDorden ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {reorderingId === orden.IDorden ? '⌛ Verificando disponibilidad...' : '🔄 Pedir de nuevo'}
                    </button>
                  )}

                  {/* 🟢 BOTÓN DE SEGUIMIENTO */}
                  {estadoId !== ESTADOS_ORDEN.ENTREGADO && estadoId !== ESTADOS_ORDEN.CANCELADO && (
                    <button
                      onClick={() => navigate(`/cliente/seguimiento/${orden.IDorden}`)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#1c7ed6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      📍 Ver Seguimiento
                    </button>
                  )}

                  {/* Botón de Cancelar */}
                  {estadoId === ESTADOS_ORDEN.CREADO && (
                    <button
                      onClick={() => setCancellingOrder(orden)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ❌ Cancelar Pedido
                    </button>
                  )}

                  {/* Botón de Calificar */}
                  {estadoId === ESTADOS_ORDEN.ENTREGADO && (
                    <button
                      onClick={() => handleAbrirCalificacion(orden)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: orden.puntaje_cliente ? '#f39c12' : '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
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

      {/* Modal de Cancelación */}
      {cancellingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h3>Cancelar Pedido #{cancellingOrder.IDorden}</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Escribe la razón por la cual deseas cancelar tu pedido:</p>

            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Motivo de la cancelación..."
              style={{ width: '100%', height: '80px', marginBottom: '1rem', padding: '0.5rem', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => { setCancellingOrder(null); setMotivoCancelacion(''); }}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Volver
              </button>
              <button
                onClick={handleConfirmarCancelar}
                disabled={submittingCancel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: submittingCancel ? '#6c757d' : '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submittingCancel ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {submittingCancel ? '⌛ Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calificación */}
      {modalOrden && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justify: 'center',
          align: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <h3>Calificar Pedido #{modalOrden.IDorden}</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>¿Cómo fue tu experiencia con este pedido?</p>

            <div style={{ margin: '1.5rem 0', fontSize: '2rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setPuntaje(star)}
                  style={{ color: star <= puntaje ? '#f1c40f' : '#ccc', padding: '0 0.2rem' }}
                >
                  ★
                </span>
              ))}
            </div>

            <p style={{ fontWeight: 'bold', color: '#333' }}>{puntaje} / 5 Estrellas</p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setModalOrden(null)}
                style={{ padding: '0.6rem 1.2rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarCalificacion}
                disabled={submittingRating}
                style={{ padding: '0.6rem 1.2rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
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