// src/components/Local/BuscadorHistorialLocal.jsx
import { useState } from 'react';
import { searchPedidosHistorial } from '../../api/localService';
import { SECUENCIA_ESTADOS } from '../../utils/estados';
import { ComprobanteModal } from './ComprobanteModal';

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
      alert(err.response?.data?.error || 'Error al realizar la búsqueda.');
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
    <div style={{ marginTop: '1.5rem', backgroundColor: '#fcfcfc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <h3>🔎 Búsqueda Avanzada e Historial de Pedidos</h3>
      
      <form onSubmit={ejecutarBusqueda} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Pedido # ID o Cliente:</label>
          <input
            type="text"
            name="busqueda"
            value={filtros.busqueda}
            onChange={handleInputChange}
            placeholder="Ej: 1045 o Juan Perez"
            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Desde:</label>
          <input
            type="date"
            name="fechaInicio"
            value={filtros.fechaInicio}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Hasta:</label>
          <input
            type="date"
            name="fechaFin"
            value={filtros.fechaFin}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Estado:</label>
          <select
            name="estado"
            value={filtros.estado}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '4px' }}
          >
            <option value="todos">Todos los estados</option>
            <option value="1">⏳ Pendiente</option>
            <option value="2">👨‍🍳 En Preparación</option>
            <option value="7">🔔 Listo para Retiro</option>
            <option value="3">✅ Entregado</option>
            <option value="6">❌ Cancelado</option>
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={limpiarFiltros}
            style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer' }}
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.5rem 1.2rem', border: 'none', backgroundColor: '#1c7ed6', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
          >
            {loading ? 'Buscando...' : '🔍 Buscar Pedidos'}
          </button>
        </div>
      </form>

      {/* Resultados de la Búsqueda */}
      {buscado && resultados.length === 0 && !loading && (
        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>No se encontraron pedidos con los criterios ingresados.</p>
      )}

      {resultados.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Fecha</th>
                <th style={{ padding: '8px' }}>Cliente</th>
                <th style={{ padding: '8px' }}>Estado</th>
                <th style={{ padding: '8px' }}>Total</th>
                <th style={{ padding: '8px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((ord) => {
                const configEstado = SECUENCIA_ESTADOS[ord.IDestado] || {};
                return (
                  <tr key={ord.IDorden} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>#{ord.IDorden}</td>
                    <td style={{ padding: '8px' }}>{new Date(ord.fecha_creacion).toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>
                      {[ord.cliente_nombre, ord.cliente_apellido]
                        .filter((valor) => valor?.trim())
                        .join(' ')
                        .trim() || ord.cliente_username || `Cliente #${ord.IDcliente}`}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ backgroundColor: configEstado.bg || '#eee', color: configEstado.color || '#000', padding: '2px 6px', borderRadius: '12px', fontSize: '0.8rem' }}>
                        {ord.estado_orden}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>${Number(ord.total).toFixed(2)}</td>
                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={() => setOrdenParaImprimir(ord)}
                        style={{ padding: '0.3rem 0.6rem', border: 'none', backgroundColor: '#495057', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        🖨️ Ver Ticket
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ordenParaImprimir && (
        <ComprobanteModal
          orden={ordenParaImprimir}
          onClose={() => setOrdenParaImprimir(null)}
        />
      )}
    </div>
  );
};