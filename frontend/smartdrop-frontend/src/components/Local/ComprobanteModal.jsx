import React from 'react';
import './css/print.css';

export const ComprobanteModal = ({ orden, onClose }) => {
  if (!orden) return null;

  // 1. Filtrar solo los productos que corresponden a este local y NO estén cancelados
  const productosValidos = (orden.productos || []).filter(
    (prod) => Number(prod.IDestado_detalle || prod.IDestado) !== 6
  );

  const productosCancelados = (orden.productos || []).filter(
    (prod) => Number(prod.IDestado_detalle || prod.IDestado) === 6
  );

  // 2. Recalcular subtotal de los ítems vigentes en esta comanda
  const subtotalLocal = productosValidos.reduce((acc, prod) => {
    return acc + Number(prod.precio_unitario || prod.precio || 0) * prod.cantidad;
  }, 0);

  const esOrdenCancelada = Number(orden.IDestado) === 6;
  const nombreCliente = [orden.cliente_nombre, orden.cliente_apellido]
    .filter((valor) => valor?.trim())
    .join(' ')
    .trim() || orden.cliente_username || `Cliente #${orden.IDcliente}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-actions-bar no-print">
          <h3>🖨️ Vista Previa Comanda / Ticket</h3>
          <div>
            <button onClick={() => window.print()} className="btn-print">
              🖨️ Imprimir
            </button>
            <button onClick={onClose} className="btn-close">
              ✖️ Cerrar
            </button>
          </div>
        </div>

        <div className="ticket-printable">
          <div className="ticket-header">
            <h2>SMARTDROP</h2>
            <p><strong>Comanda de Cocina / Caja</strong></p>
            {esOrdenCancelada && (
              <div style={{ border: '2px solid red', color: 'red', fontWeight: 'bold', padding: '4px', margin: '5px 0' }}>
                *** PEDIDO CANCELADO ***
                {orden.motivo_cancelacion && <p style={{ margin: 0, fontSize: '0.75rem' }}>Motivo: {orden.motivo_cancelacion}</p>}
              </div>
            )}
            <hr />
            <p><strong>Pedido #:</strong> {orden.IDorden || orden.id}</p>
            <p><strong>Fecha:</strong> {new Date(orden.fecha_creacion || Date.now()).toLocaleString()}</p>
            <p><strong>Cliente:</strong> {nombreCliente}</p>
          </div>

          <hr className="dashed" />

          <div className="ticket-items">
            <h4>📦 PRODUCTOS A PREPARAR</h4>
            {productosValidos.length === 0 ? (
              <p>No hay productos activos para preparar.</p>
            ) : (
              productosValidos.map((prod, idx) => (
                <div key={idx} className="ticket-item">
                  <div className="item-main">
                    <span><strong>{prod.cantidad}x</strong> {prod.producto || prod.nombre}</span>
                    <span>${(Number(prod.precio_unitario || prod.precio || 0) * prod.cantidad).toFixed(2)}</span>
                  </div>
                  {prod.opciones?.length > 0 && (
                    <div className="item-sub">
                      • {prod.opciones.map((o) => `${o.cantidad > 1 ? `${o.cantidad}x ` : ''}${o.nombre}`).join(', ')}
                    </div>
                  )}
                  {prod.comentario && <div className="item-note">💬 {prod.comentario}</div>}
                </div>
              ))
            )}

            {/* Mostrar sección opcional de ítems cancelados si existen */}
            {productosCancelados.length > 0 && (
              <div style={{ marginTop: '10px', opacity: 0.7 }}>
                <h5 style={{ margin: '5px 0', color: 'red' }}>❌ ÍTEMS CANCELADOS / RECHAZADOS</h5>
                {productosCancelados.map((prod, idx) => (
                  <div key={idx} className="ticket-item" style={{ textDecoration: 'line-through' }}>
                    <div className="item-main">
                      <span>{prod.cantidad}x {prod.producto || prod.nombre}</span>
                    </div>
                    {prod.motivo_rechazo && (
                      <div className="item-note">Motivo: {prod.motivo_rechazo}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="dashed" />

          <div className="ticket-footer">
            <p><span>Subtotal Local:</span> <span>${subtotalLocal.toFixed(2)}</span></p>
            <h3><span>TOTAL COMANDA:</span> <span>${subtotalLocal.toFixed(2)}</span></h3>
            <hr />
            <p className="center">*** GRACIAS POR SU COMPRA ***</p>
          </div>
        </div>
      </div>
    </div>
  );
};