// src/components/Cliente/LocalesLista.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { estaLocalAbierto, obtenerResumenHorarios } from '../../utils/horarios';
import { getCategoriasComerciales } from '../../api/productService';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const obtenerImagenLocal = (local) => {
  const imagen = local.logo_url || local.foto_url || local.banner_url;
  if (!imagen) return null;
  return imagen.startsWith('http') ? imagen : `${API_BASE_URL}${imagen}`;
};

export const LocalesLista = ({ locales = [] }) => {
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [categoriasLista, setCategoriasLista] = useState([]);

  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const data = await getCategoriasComerciales();
        setCategoriasLista(data);
      } catch (err) {
        console.error('Error al obtener categorías comerciales:', err);
      }
    };
    cargarCategorias();
  }, []);

  const localesFiltrados = useMemo(() => {
    const filtrados = locales.filter((local) => {
      const estaActivo = Number(local.es_activo ?? local.activo ?? 1) === 1;
      if (!estaActivo) return false;

      const cumpleCategoria =
        categoriaSeleccionada === 'todas' ||
        (local.categorias && local.categorias.includes(categoriaSeleccionada));

      const termino = busqueda.toLowerCase().trim();
      const coincideNombreLocal = local.nombre.toLowerCase().includes(termino);
      const coincideAlgunaCategoria = local.categorias?.some((cat) =>
        cat.toLowerCase().includes(termino)
      );

      const cumpleBusqueda =
        termino === '' || coincideNombreLocal || coincideAlgunaCategoria;

      return cumpleCategoria && cumpleBusqueda;
    });

    return filtrados.sort((a, b) => {
      const abiertoA = estaLocalAbierto(a, a.horarios);
      const abiertoB = estaLocalAbierto(b, b.horarios);

      if (abiertoA === abiertoB) return 0;
      return abiertoA ? -1 : 1;
    });
  }, [locales, busqueda, categoriaSeleccionada]);

  return (
    <div className="sd-container">
      {/* Encabezado */}
      <div className="sd-locales-header">
        <div className="sd-locales-title">
          <div className="sd-locales-title__icon">🏪</div>
          <span>Locales Disponibles</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="sd-filters-bar">
        <div className="sd-search-input-wrapper">
          <span className="admin-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar local o tipo de comida (Ej: Hamburguesas, Pizzería)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="sd-search-input"
          />
        </div>

        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          className="sd-select-filter"
        >
          <option value="todas">🏷️ Todas las Categorías</option>
          {categoriasLista.map((cat) => (
            <option key={cat.id} value={cat.nombre}>
              🍔 {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Listado de Locales Filtrados */}
      {!localesFiltrados || localesFiltrados.length === 0 ? (
        <div className="admin-state">
          <span>🚫 No se encontraron locales que coincidan con la búsqueda.</span>
        </div>
      ) : (
        <div className="sd-locales-grid">
          {localesFiltrados.map((local) => {
            const abierto = estaLocalAbierto(local, local.horarios);
            const imagenLocal = obtenerImagenLocal(local);
            const { diasInactivos, tieneDiasInactivos } = obtenerResumenHorarios(
              local.horarios
            );

            return (
              <div
                key={local.id}
                className={`sd-store-card ${!abierto ? 'sd-store-card--closed' : ''}`}
              >
                <div className="sd-store-card__img-container">
                  {imagenLocal ? (
                    <img
                      src={imagenLocal}
                      alt={`Imagen de ${local.nombre}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="sd-store-card__img"
                    />
                  ) : (
                    <div className="sd-store-card__img-fallback">
                      Sin imagen disponible
                    </div>
                  )}
                </div>

                <div className="sd-store-card__body">
                  <div className="sd-store-card__head">
                    <h3 className="sd-store-card__title">{local.nombre}</h3>
                    <span
                      className={`admin-badge ${
                        abierto ? 'admin-badge--success' : 'admin-badge--error'
                      }`}
                    >
                      <span className="admin-dot"></span>
                      {abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>

                  <p className="sd-store-card__address">
                    <span>📍</span> {local.direccion}
                  </p>

                  {local.categorias && local.categorias.length > 0 && (
                    <div className="sd-store-card__tags">
                      {local.categorias.map((cat) => (
                        <span key={cat} className="sd-store-tag">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {tieneDiasInactivos ? (
                    <div className="sd-store-schedule-alert sd-store-schedule-alert--warning">
                      <span>🚫</span>
                      <span>Cerrado los días: {diasInactivos.join(', ')}</span>
                    </div>
                  ) : (
                    <div className="sd-store-schedule-alert sd-store-schedule-alert--success">
                      <span>⚡</span>
                      <span>Abre todos los días de la semana</span>
                    </div>
                  )}
                </div>

                <div className="sd-store-card__footer">
                  <button
                    onClick={() => navigate(`/cliente/locales/local/${local.id}`)}
                    className={`admin-btn admin-btn--block ${
                      abierto ? 'admin-btn--primary' : 'admin-btn--outline'
                    }`}
                  >
                    {abierto ? '🍽️ Ver Menú' : '👁️ Ver Menú (Cerrado)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};