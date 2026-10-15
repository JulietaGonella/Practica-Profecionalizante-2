import React from 'react';
import { Icon } from './LocalUI';
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
      const gananciaItemNeto = prod.ganancia_local_item !== undefined
        ? Number(prod.ganancia_local_item)
        : Number((totalItemBruto * 0.90).toFixed(2));

      // Comisión retenida por la Plataforma/Sistema
      const comisionItem = prod.comision_plataforma_item !== undefined
        ? Number(prod.comision_plataforma_item)
        : Number((totalItemBruto - gananciaItemNeto).toFixed(2));

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
      <div className="modal-content" role="dialog" aria-modal="true" aria-label="Vista previa de comanda / ticket">
        <div className="modal-actions-bar no-print">
          <div className="ticket-modal-heading">
            <span className="ticket-modal-icon" aria-hidden="true">
              <Icon name="printer" size={20} />
            </span>
            <div>
              <h3>Vista previa comanda / ticket</h3>
              <p>Pedido #{orden.IDorden || orden.id}</p>
            </div>
          </div>

          <div className="modal-actions-buttons">
            <button type="button" onClick={() => window.print()} className="btn-print">
              <Icon name="printer" size={16} />
              Imprimir
            </button>
            <button type="button" onClick={onClose} className="btn-close">
              <Icon name="x" size={16} />
              Cerrar
            </button>
          </div>
        </div>

        <div className="ticket-stage">
          <div className="ticket-printable">
            <div className="ticket-header">
              <h2>SMARTDROP</h2>
              <p><strong>Comanda de Cocina / Caja</strong></p>
              {esOrdenCancelada && (
                <div className="ticket-cancelled">
                  *** PEDIDO CANCELADO ***
                  {orden.motivo_cancelacion && <p>Motivo: {orden.motivo_cancelacion}</p>}
                </div>
              )}
              <hr />
              <p><strong>Pedido #:</strong> {orden.IDorden || orden.id}</p>
              <p><strong>Fecha:</strong> {new Date(orden.fecha_creacion || Date.now()).toLocaleString()}</p>
              <p><strong>Cliente:</strong> {nombreCliente}</p>
            </div>

            <hr className="dashed" />

            <div className="ticket-items">
              <h4>PRODUCTOS A PREPARAR</h4>
              {productosValidos.length === 0 ? (
                <p>No hay productos activos para preparar.</p>
              ) : (
                productosValidos.map((prod, idx) => {
                  const cantidad = Number(prod.cantidad || 1);
                  const precioUnitario = Number(prod.precio_unitario || prod.precio || 0);
                  const totalBrutoItem = precioUnitario * cantidad;

                  const gananciaNetoItem = prod.ganancia_local_item !== undefined
                    ? Number(prod.ganancia_local_item)
                    : Number((totalBrutoItem * 0.90).toFixed(2));

                  return (
                    <div key={idx} className="ticket-item">
                      <div className="item-main">
                        <span><strong>{prod.cantidad}x</strong> {prod.producto || prod.nombre}</span>
                        <div className="item-amounts">
                          <div>Venta Total: ${totalBrutoItem.toFixed(2)}</div>
                          <div className="item-net">Neto Local: ${gananciaNetoItem.toFixed(2)}</div>
                        </div>
                      </div>
                      {prod.opciones?.length > 0 && (
                        <div className="item-sub">
                          • {prod.opciones.map((o) => `${o.cantidad > 1 ? `${o.cantidad}x ` : ''}${o.nombre}`).join(', ')}
                        </div>
                      )}
                      {prod.comentario && <div className="item-note">Nota: {prod.comentario}</div>}
                    </div>
                  );
                })
              )}

              {/* Sección opcional de ítems cancelados */}
              {productosCancelados.length > 0 && (
                <div className="ticket-cancelled-items">
                  <h5>ÍTEMS CANCELADOS / RECHAZADOS</h5>
                  {productosCancelados.map((prod, idx) => (
                    <div key={idx} className="ticket-item ticket-item--cancelled">
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
    </div>
  );
};