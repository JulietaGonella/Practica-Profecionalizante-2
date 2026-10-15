// src/components/Local/ComanderaLocal.jsx
import { useState, useEffect, useCallback } from 'react';
import { getMisPedidosLocal, updateEstadoOrdenLocal, searchPedidosHistorial } from '../../api/localService';
import { SECUENCIA_ESTADOS, ESTADOS_ORDEN } from '../../utils/estados';
import { ComprobanteModal } from './ComprobanteModal';
import { Icon, Spinner, Badge, EstadoBadge, AvisoModal, visualEstado } from './LocalUI';
import './css/Local.css';

export const ComanderaLocal = () => {
  const [pedidos, setPedidos] = useState([]);
  const [subvista, setSubvista] = useState('activos'); // 'activos' | 'historial'

  // Filtros Avanzados
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actualizandoId, setActualizandoId] = useState(null);
  const [accionProcesando, setAccionProcesando] = useState(null);

  // Estados para Modal de Rechazo e Impresión
  const [modalRechazo, setModalRechazo] = useState({ abierto: false, orden: null, producto: null });
  const [motivoTexto, setMotivoTexto] = useState('');
  const [ordenParaImprimir, setOrdenParaImprimir] = useState(null);

  // 🟢 Estado para el Modal Estético de Avisos (Reemplazo de los alert)
  const [modalAviso, setModalAviso] = useState(null); // { titulo: '', mensaje: '' }

  // --- Funciones auxiliares de cálculo de estado ---
  const estadoOrden = (orden) => Number(orden.IDestado ?? orden.id_estado ?? 1);
  const estadoDetalle = (detalle) => Number(detalle.IDestado_detalle ?? detalle.IDestado ?? 1);

  const obtenerNombreCliente = (orden) => {
    const nombreCompleto = [orden.cliente_nombre, orden.cliente_apellido]
      .filter((valor) => valor?.trim())
      .join(' ')
      .trim();

    return nombreCompleto || orden.cliente_username || `Cliente #${orden.IDcliente}`;
  };

  const detalleBloqueado = (detalle) => {
    const detEstado = estadoDetalle(detalle);
    return [
      ESTADOS_ORDEN.LISTO_PARA_RETIRO,
      ESTADOS_ORDEN.REPARTIDOR_ASIGNADO,
      ESTADOS_ORDEN.EN_CAMINO,
      ESTADOS_ORDEN.ENTREGADO,
      ESTADOS_ORDEN.CANCELADO
    ].includes(detEstado);
  };

  const puedeAceptarDetalle = (detalle) => estadoDetalle(detalle) === ESTADOS_ORDEN.CREADO;
  const puedeMarcarListoItem = (detalle) => !detalleBloqueado(detalle) && estadoDetalle(detalle) === ESTADOS_ORDEN.EN_PROGRESO;

  // --- Carga y Búsqueda Servidor / Local ---
  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (subvista === 'historial' || busquedaTexto || fechaInicio || fechaFin || filtroEstado !== 'todos') {
        // Búsqueda avanzada contra API backend
        const filtros = {
          busqueda: busquedaTexto,
          estado: filtroEstado,
          fechaInicio,
          fechaFin,
          soloHistorial: subvista === 'historial',
          soloActivos: subvista === 'activos'
        };
        const data = await searchPedidosHistorial(filtros);
        setPedidos(Array.isArray(data) ? data : []);
      } else {
        // Consulta estándar de pedidos del local
        const data = await getMisPedidosLocal(null, true);
        setPedidos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError(err.response?.data?.error || 'No se pudieron obtener los pedidos.');
    } finally {
      setLoading(false);
    }
  }, [subvista, busquedaTexto, filtroEstado, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarPedidos();
    // Desactivamos el polling automático si el usuario está consultando el historial o filtrando por fecha
    if (subvista === 'activos' && !fechaInicio && !fechaFin) {
      const interval = setInterval(cargarPedidos, 30000);
      return () => clearInterval(interval);
    }
  }, [cargarPedidos, subvista, fechaInicio, fechaFin]);

  const handleLimpiarFiltros = () => {
    setBusquedaTexto('');
    setFiltroEstado('todos');
    setFechaInicio('');
    setFechaFin('');
  };

  const handleCambiarEstado = async (orden, nuevoEstadoId, productoEspecifico = null, accionKey = null, motivo = null) => {
    const ordenId = orden.IDorden || orden.id;
    setActualizandoId(ordenId);
    setAccionProcesando(accionKey ?? `orden-${ordenId}`);

    try {
      let detallesIds = [];
      if (productoEspecifico) {
        const idDetalleResuelto = productoEspecifico.IDdetalle || productoEspecifico.id;
        if (idDetalleResuelto) detallesIds = [idDetalleResuelto];
      } else {
        detallesIds = (orden.productos || []).map((p) => p.IDdetalle || p.id).filter(Boolean);
      }

      if (detallesIds.length === 0) {
        // 🟢 Reemplazo del primer alert nativo por el modal estético
        setModalAviso({
          titulo: '⚠️ Ítem no identificado',
          mensaje: 'No se pudo identificar el ítem a actualizar.'
        });
        return;
      }

      await updateEstadoOrdenLocal(ordenId, nuevoEstadoId, detallesIds, motivo);
      await cargarPedidos();
    } catch (err) {
      // 🟢 Reemplazo del segundo alert nativo por el modal estético
      setModalAviso({
        titulo: '⚠️ Error de Actualización',
        mensaje: err.response?.data?.error || 'Error al actualizar el estado del pedido'
      });
    } finally {
      setActualizandoId(null);
      setAccionProcesando(null);
    }
  };

  const abrirModalRechazo = (orden, prod) => {
    setModalRechazo({ abierto: true, orden, producto: prod });
    setMotivoTexto('');
  };

  const confirmarRechazoModal = () => {
    if (!motivoTexto.trim()) return;
    const { orden, producto } = modalRechazo;
    const ordenId = orden.IDorden || orden.id;
    const detalleId = producto.IDdetalle || producto.id;
    const keyRechazar = `rechazar-${ordenId}-${detalleId}`;

    handleCambiarEstado(orden, ESTADOS_ORDEN.CANCELADO, producto, keyRechazar, motivoTexto.trim());
    setModalRechazo({ abierto: false, orden: null, producto: null });
    setMotivoTexto('');
  };

  const getEtiquetaEstado = (estadoId, estadoNombre) => {
    const config = SECUENCIA_ESTADOS[estadoId] || {
      etiqueta: estadoNombre || 'Desconocido'
    };

    return <EstadoBadge estadoId={estadoId} etiqueta={config.etiqueta} />;
  };

  // Filtrado defensivo de cliente/subvista en memoria
  const pedidosFiltrados = pedidos.filter((orden) => {
    const estado = estadoOrden(orden);
    if (subvista === 'activos') {
      return [
        ESTADOS_ORDEN.CREADO,
        ESTADOS_ORDEN.EN_PROGRESO,
        ESTADOS_ORDEN.LISTO_PARA_RETIRO,
        ESTADOS_ORDEN.REPARTIDOR_ASIGNADO,
        ESTADOS_ORDEN.EN_CAMINO
      ].includes(estado);
    } else {
      return [
        ESTADOS_ORDEN.ENTREGADO,
        ESTADOS_ORDEN.CANCELADO
      ].includes(estado);
    }
  });

  // Resumen de pedidos activos por estado (derivado de la lista ya filtrada)
  const contarEstado = (estados) =>
    pedidosFiltrados.filter((o) => estados.includes(estadoOrden(o))).length;

  const hayFiltros = busquedaTexto || filtroEstado !== 'todos' || fechaInicio || fechaFin;

  return (
    <section className="local-section">
      {/* Encabezado principal */}
      <div className="local-section-head">
        <div>
          <h2 className="local-title">
            <span className="local-title__icon"><Icon name="clipboard" size={20} /></span>
            Comandera e historial de pedidos
          </h2>
        </div>

        <button
          type="button"
          onClick={cargarPedidos}
          disabled={loading}
          className="local-btn local-btn--outline"
        >
          {loading ? <><Spinner /> Cargando...</> : <><Icon name="refresh" /> Buscar / Actualizar</>}
        </button>
      </div>

      {/* Pestañas de navegación */}
      <div className="local-subtabs">
        <button
          type="button"
          onClick={() => {
            setSubvista('activos');
            handleLimpiarFiltros();
          }}
          className={subvista === 'activos' ? 'active' : ''}
          aria-pressed={subvista === 'activos'}
        >
          <Icon name="bell" />
          Pedidos activos
        </button>

        <button
          type="button"
          onClick={() => {
            setSubvista('historial');
            handleLimpiarFiltros();
          }}
          className={subvista === 'historial' ? 'active' : ''}
          aria-pressed={subvista === 'historial'}
        >
          <Icon name="history" />
          Historial y búsqueda avanzada
        </button>
      </div>

      {/* Resumen de pedidos activos */}
      {subvista === 'activos' && pedidosFiltrados.length > 0 && (
        <div className="local-stats">
          <div className="local-stat">
            <span className="local-stat__icon local-stat__icon--warning"><Icon name="clock" size={18} /></span>
            <div>
              <strong>{contarEstado([ESTADOS_ORDEN.CREADO])}</strong>
              <span>Nuevos</span>
            </div>
          </div>
          <div className="local-stat">
            <span className="local-stat__icon local-stat__icon--info"><Icon name="chefHat" size={18} /></span>
            <div>
              <strong>{contarEstado([ESTADOS_ORDEN.EN_PROGRESO])}</strong>
              <span>En preparación</span>
            </div>
          </div>
          <div className="local-stat">
            <span className="local-stat__icon local-stat__icon--orange"><Icon name="bell" size={18} /></span>
            <div>
              <strong>{contarEstado([ESTADOS_ORDEN.LISTO_PARA_RETIRO])}</strong>
              <span>Listos para retiro</span>
            </div>
          </div>
          <div className="local-stat">
            <span className="local-stat__icon local-stat__icon--navy"><Icon name="bike" size={18} /></span>
            <div>
              <strong>{contarEstado([ESTADOS_ORDEN.REPARTIDOR_ASIGNADO, ESTADOS_ORDEN.EN_CAMINO])}</strong>
              <span>En reparto</span>
            </div>
          </div>
        </div>
      )}

      {/* Panel avanzado de filtros */}
      <div className="local-filters">
        <div className="local-search">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Buscar ID de orden o cliente..."
            aria-label="Buscar ID de orden o cliente"
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            className="local-input"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
          className="local-select"
        >
          <option value="todos">Todos los estados</option>
          {subvista === 'activos' ? (
            <>
              <option value="1">Creado</option>
              <option value="2">En preparación</option>
              <option value="7">Listo para retiro</option>
              <option value="4">Repartidor asignado</option>
              <option value="5">En camino</option>
            </>
          ) : (
            <>
              <option value="3">Entregado</option>
              <option value="6">Cancelado</option>
            </>
          )}
        </select>

        <label className="local-field">
          <span>Desde</span>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="local-input"
          />
        </label>

        <label className="local-field">
          <span>Hasta</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="local-input"
          />
        </label>

        {hayFiltros && (
          <button
            type="button"
            onClick={handleLimpiarFiltros}
            className="local-btn local-btn--ghost"
          >
            <Icon name="x" size={16} />
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <div className="local-state local-state--error" role="alert">
          <Icon name="alert" size={24} />
          {error}
        </div>
      )}

      {/* Tarjetas de pedidos */}
      {pedidosFiltrados.length === 0 && !loading ? (
        <div className="local-state">
          <Icon name="package" size={28} />
          <p>
            {subvista === 'activos'
              ? 'No hay pedidos activos que coincidan con los criterios de búsqueda.'
              : 'No se encontraron pedidos en el historial para los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="local-orders">
          {pedidosFiltrados.map((orden) => {
            const estadoActual = estadoOrden(orden);
            const esOrdenCancelada = estadoActual === ESTADOS_ORDEN.CANCELADO;

            // 1. Identificar si el pedido está en curso (no finalizado ni cancelado)
            const esPedidoEnCurso = ![
              ESTADOS_ORDEN.ENTREGADO, // 3
              ESTADOS_ORDEN.CANCELADO  // 6
            ].includes(estadoActual);

            // 2. Comprobar si tiene repartidor asignado
            const tieneRepartidorAsignado = Boolean(orden.IDrepartidor);

            return (
              <article
                key={orden.IDorden || orden.id}
                className={`local-order local-order--${visualEstado(estadoActual).tone}`}
              >
                <div>
                  <div className="local-order__head">
                    <h3>Pedido #{orden.IDorden || orden.id}</h3>

                    <div className="local-order__badges">
                      {/* Repartidor asignado solo para pedidos en curso que ya avanzaron a estados posteriores */}
                      {esPedidoEnCurso && tieneRepartidorAsignado && estadoActual !== ESTADOS_ORDEN.REPARTIDOR_ASIGNADO && (
                        <Badge tone="navy" icon="bike">Repartidor asignado</Badge>
                      )}

                      {/* Estado general o efectivo de la orden */}
                      {getEtiquetaEstado(estadoActual, orden.estado_orden)}
                    </div>
                  </div>

                  {esOrdenCancelada && (
                    <div className="local-cancel-note" style={{ marginTop: '12px' }}>
                      <Icon name="alert" size={16} />
                      <div>
                        Pedido cancelado
                        {orden.motivo_cancelacion && (
                          <small>Motivo: {orden.motivo_cancelacion}</small>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="local-order__meta" style={{ marginTop: '12px' }}>
                    <span>
                      <Icon name="user" size={14} />
                      <span><strong>Cliente:</strong> {obtenerNombreCliente(orden)}</span>
                    </span>
                    {orden.fecha_creacion && (
                      <span>
                        <Icon name="calendar" size={14} />
                        <span><strong>Fecha:</strong> {new Date(orden.fecha_creacion).toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="local-order__items-title">
                  <Icon name="package" size={16} />
                  Ítems solicitados
                </h4>

                <div className="local-items">
                  {(orden.productos || []).map((prod) => {
                    const detEstado = estadoDetalle(prod);
                    const esItemCancelado = detEstado === ESTADOS_ORDEN.CANCELADO;
                    const editable = puedeMarcarListoItem(prod);
                    const aceptarDetalle = puedeAceptarDetalle(prod);
                    const detalleBloqueadoActual = detalleBloqueado(prod);
                    const keyAceptar = `aceptar-${orden.IDorden || orden.id}-${prod.IDdetalle || prod.id}`;
                    const keyListo = `listo-${orden.IDorden || orden.id}-${prod.IDdetalle || prod.id}`;

                    return (
                      <div
                        key={prod.IDdetalle || prod.id}
                        className={`local-item ${esItemCancelado ? 'local-item--cancelled' : ''}`}
                      >
                        <div className="local-item__name">
                          <span className="local-item__qty">{prod.cantidad}x</span>
                          <span>{prod.producto || prod.nombre}</span>
                        </div>

                        {!esItemCancelado && (() => {
                          const cantidad = Number(prod.cantidad || 1);
                          const precio = Number(prod.precio_unitario || prod.precio || 0);
                          const totalBruto = cantidad * precio;
                          const netoLocal = prod.ganancia_local_item !== undefined
                            ? Number(prod.ganancia_local_item)
                            : Number((totalBruto * 0.90).toFixed(2));
                          const comisionSistema = prod.comision_plataforma_item !== undefined
                            ? Number(prod.comision_plataforma_item)
                            : Number((totalBruto - netoLocal).toFixed(2));

                          return (
                            <div className="local-item__money">
                              <span>Total: <strong>${totalBruto.toFixed(2)}</strong></span>
                              <span className="net">Neto: ${netoLocal.toFixed(2)}</span>
                              <span>Sistema: ${comisionSistema.toFixed(2)}</span>
                            </div>
                          );
                        })()}

                        <div className="local-item__foot">
                          {getEtiquetaEstado(detEstado, prod.estado_detalle)}

                          {!detalleBloqueadoActual && !esOrdenCancelada && subvista === 'activos' && (
                            <div className="local-item__actions">
                              {aceptarDetalle && (
                                <button
                                  type="button"
                                  onClick={() => handleCambiarEstado(orden, ESTADOS_ORDEN.EN_PROGRESO, prod, keyAceptar)}
                                  disabled={actualizandoId === (orden.IDorden || orden.id) || accionProcesando === keyAceptar}
                                  className="local-btn local-btn--sm local-btn--primary"
                                >
                                  {accionProcesando === keyAceptar ? (
                                    <><Spinner /> Aceptando...</>
                                  ) : (
                                    <><Icon name="chefHat" size={14} /> Aceptar</>
                                  )}
                                </button>
                              )}

                              {editable && (
                                <button
                                  type="button"
                                  onClick={() => handleCambiarEstado(orden, ESTADOS_ORDEN.LISTO_PARA_RETIRO, prod, keyListo)}
                                  disabled={actualizandoId === (orden.IDorden || orden.id) || accionProcesando === keyListo}
                                  className="local-btn local-btn--sm local-btn--success"
                                >
                                  {accionProcesando === keyListo ? (
                                    <><Spinner /> Marcando...</>
                                  ) : (
                                    <><Icon name="check" size={14} /> Listo</>
                                  )}
                                </button>
                              )}

                              {aceptarDetalle && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalRechazo(orden, prod)}
                                  disabled={actualizandoId === (orden.IDorden || orden.id)}
                                  className="local-btn local-btn--sm local-btn--danger-soft"
                                >
                                  <Icon name="x" size={14} />
                                  Rechazar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="local-order__foot">
                  <button
                    type="button"
                    onClick={() => setOrdenParaImprimir(orden)}
                    className="local-btn local-btn--sm local-btn--outline"
                  >
                    <Icon name="printer" size={14} />
                    Ticket / Comanda
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de rechazo */}
      {modalRechazo.abierto && (
        <div className="local-modal-overlay">
          <div className="local-modal" role="dialog" aria-modal="true" aria-label="Rechazar producto">
            <div className="local-modal__head">
              <div>
                <h3>Rechazar producto</h3>
                <p>
                  Ingresá el motivo del rechazo para{' '}
                  <strong>{modalRechazo.producto?.producto || modalRechazo.producto?.nombre}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRechazo({ abierto: false, orden: null, producto: null })}
                className="local-icon-btn"
                aria-label="Cerrar"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <label className="local-field">
              <span>Motivo</span>
              <textarea
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                placeholder="Motivo..."
                rows={3}
                className="local-textarea"
              />
            </label>

            <div className="local-modal__foot">
              <button
                type="button"
                onClick={() => setModalRechazo({ abierto: false, orden: null, producto: null })}
                className="local-btn local-btn--outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRechazoModal}
                disabled={!motivoTexto.trim()}
                className="local-btn local-btn--danger"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aviso general: flota sobre cualquier otro modal */}
      {modalAviso && (
        <AvisoModal
          titulo={modalAviso.titulo}
          mensaje={modalAviso.mensaje}
          onClose={() => setModalAviso(null)}
        />
      )}

      {/* Modal de impresión */}
      {ordenParaImprimir && (
        <ComprobanteModal orden={ordenParaImprimir} onClose={() => setOrdenParaImprimir(null)} />
      )}
    </section>
  );
};