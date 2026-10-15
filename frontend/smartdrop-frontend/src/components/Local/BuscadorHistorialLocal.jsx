// src/components/Local/BuscadorHistorialLocal.jsx
import { useState } from 'react';
import { searchPedidosHistorial } from '../../api/localService';
import { SECUENCIA_ESTADOS } from '../../utils/estados';
import { ComprobanteModal } from './ComprobanteModal';
import { Icon, Spinner, EstadoBadge, AvisoModal } from './LocalUI';
import './css/Local.css';

export const BuscadorHistorialLocal = () => {
  const [filtros, setFiltros] = useState({
    busqueda: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'todos'
  });

  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [ordenParaImprimir, setOrdenParaImprimir] = useState(null);

  // 🟢 Estado para el Modal Estético de Avisos (Reemplazo del alert)
  const [modalAviso, setModalAviso] = useState(null); // { titulo: '', mensaje: '' }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const ejecutarBusqueda = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await searchPedidosHistorial(filtros);
      setResultados(Array.isArray(data) ? data : []);
      setBuscado(true);
    } catch (err) {
      // 🟢 Reemplazamos el alert nativo por el modal estético de avisos con alta prioridad
      setModalAviso({
        titulo: '⚠️ Error de Búsqueda',
        mensaje: err.response?.data?.error || 'Error al realizar la búsqueda.'
      });
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({ busqueda: '', fechaInicio: '', fechaFin: '', estado: 'todos' });
    setResultados([]);
    setBuscado(false);
  };

  return (
    <section className="local-card local-scope">
      <h3 className="local-card__title">
        <Icon name="search" size={18} />
        Búsqueda avanzada e historial de pedidos
      </h3>

      <form onSubmit={ejecutarBusqueda} className="local-filters local-filters--form" style={{ marginBottom: '20px', boxShadow: 'none' }}>
        <label className="local-field">
          <span>Pedido # ID o cliente</span>
          <input
            type="text"
            name="busqueda"
            value={filtros.busqueda}
            onChange={handleInputChange}
            placeholder="Ej: 1045 o Juan Perez"
            className="local-input"
          />
        </label>

        <label className="local-field">
          <span>Desde</span>
          <input
            type="date"
            name="fechaInicio"
            value={filtros.fechaInicio}
            onChange={handleInputChange}
            className="local-input"
          />
        </label>

        <label className="local-field">
          <span>Hasta</span>
          <input
            type="date"
            name="fechaFin"
            value={filtros.fechaFin}
            onChange={handleInputChange}
            className="local-input"
          />
        </label>

        <label className="local-field">
          <span>Estado</span>
          <select
            name="estado"
            value={filtros.estado}
            onChange={handleInputChange}
            className="local-select"
          >
            <option value="todos">Todos los estados</option>
            <option value="1">Pendiente</option>
            <option value="2">En preparación</option>
            <option value="7">Listo para retiro</option>
            <option value="3">Entregado</option>
            <option value="6">Cancelado</option>
          </select>
        </label>

        <div className="local-filters__actions local-filters__actions--full">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="local-btn local-btn--outline"
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="local-btn local-btn--primary"
          >
            {loading ? (
              <><Spinner /> Buscando...</>
            ) : (
              <><Icon name="search" size={16} /> Buscar pedidos</>
            )}
          </button>
        </div>
      </form>

      {/* Resultados de la búsqueda */}
      {buscado && resultados.length === 0 && !loading && (
        <div className="local-state">
          <Icon name="package" size={28} />
          <p>No se encontraron pedidos con los criterios ingresados.</p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="local-table-wrap">
          <table className="local-table local-table--stack">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th className="is-right">Total</th>
                <th className="is-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((ord) => {
                const configEstado = SECUENCIA_ESTADOS[ord.IDestado] || {};
                return (
                  <tr key={ord.IDorden}>
                    <td data-label="ID" className="is-strong">#{ord.IDorden}</td>
                    <td data-label="Fecha">{new Date(ord.fecha_creacion).toLocaleString()}</td>
                    <td data-label="Cliente">
                      {[ord.cliente_nombre, ord.cliente_apellido]
                        .filter((valor) => valor?.trim())
                        .join(' ')
                        .trim() || ord.cliente_username || `Cliente #${ord.IDcliente}`}
                    </td>
                    <td data-label="Estado">
                      <EstadoBadge estadoId={ord.IDestado} etiqueta={configEstado.etiqueta || ord.estado_orden} />
                    </td>
                    <td data-label="Total" className="is-right is-strong">${Number(ord.total).toFixed(2)}</td>
                    <td data-label="Acción" className="is-right local-table__actions">
                      <button
                        type="button"
                        onClick={() => setOrdenParaImprimir(ord)}
                        className="local-btn local-btn--sm local-btn--outline"
                      >
                        <Icon name="printer" size={14} />
                        Ver ticket
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Aviso general (por encima de cualquier otro modal) */}
      {modalAviso && (
        <AvisoModal
          titulo={modalAviso.titulo}
          mensaje={modalAviso.mensaje}
          onClose={() => setModalAviso(null)}
        />
      )}

      {ordenParaImprimir && (
        <ComprobanteModal
          orden={ordenParaImprimir}
          onClose={() => setOrdenParaImprimir(null)}
        />
      )}
    </section>
  );
};