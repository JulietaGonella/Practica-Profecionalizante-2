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

  // 2. Calcular los montos del local (Bruto/Sistema, Comisión y Neto Local)
  const resumenFinanciero = productosValidos.reduce(
    (acc, prod) => {
      const cantidad = Number(prod.cantidad || 1);
      const precioUnitario = Number(prod.precio_unitario || prod.precio || 0);
      const totalItemBruto = precioUnitario * cantidad;

      // Ganancia Neta del Local
      const gananciaItemNeto =
        prod.ganancia_local_item !== undefined
          ? Number(prod.ganancia_local_item)
          : totalItemBruto * 0.90; // Fallback 10% comisión

      // Comisión retenida por la Plataforma/Sistema
      const comisionItem =
        prod.comision_plataforma_item !== undefined
          ? Number(prod.comision_plataforma_item)
          : totalItemBruto - gananciaItemNeto;

      acc.subtotalBruto += totalItemBruto;
      acc.comisionPlataforma += comisionItem;
      acc.gananciaNetoLocal += gananciaItemNeto;

      return acc;
    },
    { subtotalBruto: 0, comisionPlataforma: 0, gananciaNetoLocal: 0 }
  );

  const esOrdenCancelada = Number(orden.IDestado) === 6;
  const nombreCliente =
    [orden.cliente_nombre, orden.cliente_apellido]
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
              productosValidos.map((prod, idx) => {
                const cantidad = Number(prod.cantidad || 1);
                const precioUnitario = Number(prod.precio_unitario || prod.precio || 0);
                const totalBrutoItem = precioUnitario * cantidad;

                const gananciaNetoItem =
                  prod.ganancia_local_item !== undefined
                    ? Number(prod.ganancia_local_item)
                    : totalBrutoItem * 0.90;

                return (
                  <div key={idx} className="ticket-item">
                    <div className="item-main">
                      <span><strong>{prod.cantidad}x</strong> {prod.producto || prod.nombre}</span>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div>Venta Total: ${totalBrutoItem.toFixed(2)}</div>
                        <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>Neto Local: ${gananciaNetoItem.toFixed(2)}</div>
                      </div>
                    </div>
                    {prod.opciones?.length > 0 && (
                      <div className="item-sub">
                        • {prod.opciones.map((o) => `${o.cantidad > 1 ? `${o.cantidad}x ` : ''}${o.nombre}`).join(', ')}
                      </div>
                    )}
                    {prod.comentario && <div className="item-note">💬 {prod.comentario}</div>}
                  </div>
                );
              })
            )}

            {/* Sección opcional de ítems cancelados */}
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
            <p><span>Total Venta (Sistema):</span> <span>${resumenFinanciero.subtotalBruto.toFixed(2)}</span></p>
            <p><span>Comisión Plataforma:</span> <span>-${resumenFinanciero.comisionPlataforma.toFixed(2)}</span></p>
            <hr />
            <h3><span>NETO PARA LOCAL:</span> <span>${resumenFinanciero.gananciaNetoLocal.toFixed(2)}</span></h3>
            <hr />
            <p className="center">*** GRACIAS POR SU COMPRA ***</p>
          </div>
        </div>
      </div>
    </div>
  );
};