import React from 'react';

export const BarraBusquedaFiltro = ({ busqueda, setBusqueda, placeholder = "Buscar..." }) => {
  return (
    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          fontSize: '0.95rem',
          border: '1px solid #ced4da',
          borderRadius: '8px',
          outline: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
      />
      {busqueda && (
        <button
          onClick={() => setBusqueda('')}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #ced4da',
            backgroundColor: '#f1f3f5',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Limpiar
        </button>
      )}
    </div>
  );
};