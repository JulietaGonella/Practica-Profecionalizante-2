import React from 'react';
import { Icon } from './AdminUI';
import './CSS/Administrador.css';

export const BarraBusquedaFiltro = ({ busqueda, setBusqueda, placeholder = "Buscar..." }) => {
  return (
    <div className="admin-searchbar">
      <div className="admin-searchbar__field">
        <Icon name="search" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="admin-searchbar__input"
        />
      </div>
      {busqueda && (
        <button
          type="button"
          onClick={() => setBusqueda('')}
          className="admin-btn admin-btn--outline"
        >
          <Icon name="x" size={16} />
          Limpiar
        </button>
      )}
    </div>
  );
};