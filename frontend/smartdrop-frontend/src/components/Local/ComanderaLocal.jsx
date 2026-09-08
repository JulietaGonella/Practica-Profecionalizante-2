import { useState, useEffect, useCallback } from 'react';
import { getMisPedidosLocal, updateEstadoOrdenLocal, searchPedidosHistorial } from '../../api/localService';
import { SECUENCIA_ESTADOS, ESTADOS_ORDEN } from '../../utils/estados';
import { ComprobanteModal } from './ComprobanteModal';

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
          fechaFin
        };
        const data = await searchPedidosHistorial(filtros);
        setPedidos(Array.isArray(data) ? data : []);
      } else {
        // Consulta estándar de pedidos del local
        const data = await getMisPedidosLocal(null);
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
        alert('No se pudo identificar el ítem a actualizar.');
        return;
      }

      await updateEstadoOrdenLocal(ordenId, nuevoEstadoId, detallesIds, motivo);
      await cargarPedidos();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar el estado del pedido');
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
      bg: '#e2e3e5',
      color: '#383d41',
      etiqueta: estadoNombre || 'Desconocido'
    };

    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '0.3rem 0.7rem',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '0.85rem'
      }}>
        {config.etiqueta}
      </span>
    );
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

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <h2>📋 Comandera e Historial de Pedidos</h2>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={cargarPedidos}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
          >
            🔄 {loading ? 'Cargando...' : 'Buscar / Actualizar'}
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '2px solid #e0e0e0' }}>
        <button
          onClick={() => {
            setSubvista('activos');
            handleLimpiarFiltros();
          }}
          style={{
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            border: 'none',
            borderBottom: subvista === 'activos' ? '3px solid #1c7ed6' : '3px solid transparent',
            fontWeight: subvista === 'activos' ? 'bold' : 'normal',
            color: subvista === 'activos' ? '#1c7ed6' : '#495057',
            backgroundColor: 'transparent',
            fontSize: '1rem'
          }}
        >
          🔔 Pedidos Activos
        </button>

        <button
          onClick={() => {
            setSubvista('historial');
            handleLimpiarFiltros();
          }}
          style={{
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            border: 'none',
            borderBottom: subvista === 'historial' ? '3px solid #1c7ed6' : '3px solid transparent',
            fontWeight: subvista === 'historial' ? 'bold' : 'normal',
            color: subvista === 'historial' ? '#1c7ed6' : '#495057',
            backgroundColor: 'transparent',
            fontSize: '1rem'
          }}
        >
          📜 Historial y Búsqueda Avanzada
        </button>
      </div>

      {/* Panel Avanzado de Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="🔎 Buscar ID de orden o cliente..."
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.8rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '0.55rem 0.8rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <option value="todos">🔍 Todos los estados</option>
            {subvista === 'activos' ? (
              <>
                <option value="1">⏳ Creado</option>
                <option value="2">👨‍🍳 En Preparación</option>
                <option value="7">🔔 Listo para Retiro</option>
                <option value="4">🛵 Repartidor Asignado</option>
                <option value="5">🚚 En Camino</option>
              </>
            ) : (
              <>
                <option value="3">✅ Entregado</option>
                <option value="6">❌ Cancelado</option>
              </>
            )}
          </select>
        </div>

        {/* Filtro por Rango de Fechas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', color: '#495057' }}>Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.85rem', color: '#495057' }}>Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
          />
        </div>

        {(busquedaTexto || filtroEstado !== 'todos' || fechaInicio || fechaFin) && (
          <button
            onClick={handleLimpiarFiltros}
            style={{
              padding: '0.5rem 0.8rem',
              backgroundColor: '#e9ecef',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Renderizado de Tarjetas de Pedidos */}
      {pedidosFiltrados.length === 0 && !loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <p style={{ color: '#666', margin: 0 }}>
            {subvista === 'activos'
              ? 'No hay pedidos activos que coincidan con los criterios de búsqueda.'
              : 'No se encontraron pedidos en el historial para los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
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
              <div
                key={orden.IDorden || orden.id}
                style={{
                  border: esOrdenCancelada ? '2px solid #f8d7da' : '1px solid #e0e0e0',
                  borderRadius: '10px',
                  padding: '1.2rem',
                  backgroundColor: esOrdenCancelada ? '#fff5f5' : '#ffffff',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: esOrdenCancelada ? 0.85 : 1
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <h3 style={{ margin: 0, color: '#2c3e50' }}>Pedido #{orden.IDorden || orden.id}</h3>
                    
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* 🛵 Badge visual de Repartidor Asignado solo para pedidos en curso */}
                      {esPedidoEnCurso && tieneRepartidorAsignado && (
                        <span style={{
                          backgroundColor: '#d0ebff',
                          color: '#1864ab',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          border: '1px solid #74c0fc'
                        }}>
                          🛵 Repartidor Asignado
                        </span>
                      )}

                      {/* Estado general o efectivo de la orden */}
                      {getEtiquetaEstado(estadoActual, orden.estado_orden)}
                    </div>
                  </div>

                  {esOrdenCancelada && (
                    <div style={{
                      backgroundColor: '#ffe3e3',
                      border: '1px solid #ffa8a8',
                      color: '#c92a2a',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      marginBottom: '0.8rem'
                    }}>
                      ⚠️ PEDIDO CANCELADO
                      {orden.motivo_cancelacion && (
                        <div style={{ fontWeight: 'normal', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                          Motivo: {orden.motivo_cancelacion}
                        </div>
                      )}
                    </div>
                  )}

                  <p style={{ fontSize: '0.9rem', color: '#666', margin: '0.2rem 0' }}>
                    👤 <strong>Cliente:</strong> {obtenerNombreCliente(orden)}
                  </p>
                  {orden.fecha_creacion && (
                    <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.2rem 0' }}>
                      📅 <strong>Fecha:</strong> {new Date(orden.fecha_creacion).toLocaleString()}
                    </p>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px dashed #ddd', margin: '0.8rem 0' }} />

                  <h4 style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📦 Ítems solicitados:</h4>

                  <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
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
                          style={{
                            padding: '0.5rem',
                            border: esItemCancelado ? '1px solid #ffa8a8' : '1px solid #f0f0f0',
                            borderRadius: '6px',
                            backgroundColor: esItemCancelado ? '#fff5f5' : '#fafafa',
                            opacity: esItemCancelado ? 0.65 : 1
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ textDecoration: esItemCancelado ? 'line-through' : 'none' }}>
                              <strong>{prod.cantidad}x</strong> {prod.producto || prod.nombre} — ${Number(prod.precio_unitario || prod.precio || 0).toFixed(2)} c/u
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '0.5rem', justifyContent: 'space-between' }}>
                            {getEtiquetaEstado(detEstado, prod.estado_detalle)}

                            {!detalleBloqueadoActual && !esOrdenCancelada && subvista === 'activos' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {aceptarDetalle && (
                                  <button
                                    onClick={() => handleCambiarEstado(orden, ESTADOS_ORDEN.EN_PROGRESO, prod, keyAceptar)}
                                    disabled={actualizandoId === (orden.IDorden || orden.id) || accionProcesando === keyAceptar}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      backgroundColor: accionProcesando === keyAceptar ? '#868e96' : '#1c7ed6',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {accionProcesando === keyAceptar ? '⏳ Aceptando...' : '👨‍🍳 Aceptar'}
                                  </button>
                                )}

                                {editable && (
                                  <button
                                    onClick={() => handleCambiarEstado(orden, ESTADOS_ORDEN.LISTO_PARA_RETIRO, prod, keyListo)}
                                    disabled={actualizandoId === (orden.IDorden || orden.id) || accionProcesando === keyListo}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      backgroundColor: accionProcesando === keyListo ? '#868e96' : '#2b8a3e',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {accionProcesando === keyListo ? '⏳ Marcando...' : '📌 Listo'}
                                  </button>
                                )}

                                {aceptarDetalle && (
                                  <button
                                    onClick={() => abrirModalRechazo(orden, prod)}
                                    disabled={actualizandoId === (orden.IDorden || orden.id)}
                                    style={{
                                      padding: '0.35rem 0.6rem',
                                      backgroundColor: '#e03131',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ❌ Rechazar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setOrdenParaImprimir(orden)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#495057',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    🖨️ Ticket / Comanda
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Rechazo */}
      {modalRechazo.abierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
            <h3>Rechazar Producto</h3>
            <p>Ingresa el motivo del rechazo para <strong>{modalRechazo.producto?.producto || modalRechazo.producto?.nombre}</strong>:</p>
            <textarea
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              placeholder="Motivo..."
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setModalRechazo({ abierto: false, orden: null, producto: null })}>Cancelar</button>
              <button onClick={confirmarRechazoModal} disabled={!motivoTexto.trim()}>Confirmar Rechazo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impresión */}
      {ordenParaImprimir && (
        <ComprobanteModal orden={ordenParaImprimir} onClose={() => setOrdenParaImprimir(null)} />
      )}
    </div>
  );
};