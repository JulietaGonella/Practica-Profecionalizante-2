// src/components/Cliente/ProductosLocal.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { estaLocalAbierto } from '../../utils/horarios';
import './CSS/Cliente.css'; // 👈 Importación de los estilos unificados

const API_URL = 'http://localhost:3000';

export const ProductosLocal = ({ locales, productos }) => {
  const { localId } = useParams();
  const navigate = useNavigate();

  // 🔍 Estados para búsqueda por texto y categoría comercial
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');

  // ⏳ Banderas de validación de carga
  const cargandoLocales = !locales;
  const cargandoProductos = !productos;

  const local = locales?.find(
    (l) => String(l.id) === String(localId)
  );

  const estaAbiertoPorHorario = local
    ? estaLocalAbierto(local, local.horarios)
    : false;

  // Helper para obtener el nombre de la categoría comercial
  const getCategoriaComercial = (p) =>
    p.categoria ||
    p.categoria_comercial ||
    'Sin Categoría';

  // 1️⃣ Filtrar productos pertenecientes a este local
  const productosDelLocal = useMemo(() => {
    if (!productos) return [];

    return productos.filter((p) => {
      const pLocalId =
        p.IDlocal ??
        p.idlocal ??
        p.local_id;

      return String(pLocalId) === String(localId);
    });
  }, [productos, localId]);

  // 2️⃣ Categorías comerciales únicas
  const categoriasComerciales = useMemo(() => {
    const listaCategorias = productosDelLocal
      .map((p) => getCategoriaComercial(p))
      .filter(Boolean);

    return [
      'todas',
      ...new Set(listaCategorias)
    ];
  }, [productosDelLocal]);

  // 3️⃣ Filtrar productos por búsqueda por texto y filtro desplegable
  const productosFiltrados = useMemo(() => {
    return productosDelLocal.filter((producto) => {
      const coincideNombre = producto.nombre
        .toLowerCase()
        .includes(
          busqueda.toLowerCase().trim()
        );

      const catComercial = getCategoriaComercial(producto);

      const coincideCategoria =
        categoriaSeleccionada === 'todas' ||
        catComercial === categoriaSeleccionada;

      return coincideNombre && coincideCategoria;
    });
  }, [
    productosDelLocal,
    busqueda,
    categoriaSeleccionada
  ]);

  // 4️⃣ Agrupar productos filtrados por categoría comercial
  const productosAgrupados = useMemo(() => {
    const grupos = {};

    productosFiltrados.forEach((producto) => {
      const cat = getCategoriaComercial(producto);
      if (!grupos[cat]) {
        grupos[cat] = [];
      }
      grupos[cat].push(producto);
    });

    return grupos;
  }, [productosFiltrados]);

  // ⏳ Cargando
  if (cargandoLocales || cargandoProductos) {
    return (
      <div className="sd-state">
        <div className="sd-spinner"></div>
        <p>Cargando catálogo del local...</p>
      </div>
    );
  }

  // ❌ Local inexistente
  if (!local) {
    return (
      <div className="sd-state sd-state--error">
        <p>El local solicitado no existe o se encuentra inactivo.</p>
      </div>
    );
  }

  return (
    <div className="sd-container">
      {/* Banner del Local */}
      <div className={`sd-local-banner ${estaAbiertoPorHorario ? 'sd-local-banner--open' : 'sd-local-banner--closed'}`}>
        <div className="sd-local-banner__head">
          <h2 className="sd-local-banner__title">{local.nombre}</h2>
          <span className={estaAbiertoPorHorario ? 'admin-badge admin-badge--success' : 'admin-badge admin-badge--error'}>
            {estaAbiertoPorHorario ? '🟢 Abierto' : '🔴 Cerrado fuera de horario'}
          </span>
        </div>

        <p className="sd-local-banner__address">
          📍 {local.direccion}
        </p>

        {!estaAbiertoPorHorario && (
          <p className="admin-text-error" style={{ fontSize: '0.8125rem', fontWeight: 'bold' }}>
            ⚠️ El local se encuentra fuera de su horario de atención.
            Puedes explorar la carta, pero los botones de compra se encuentran inactivos.
          </p>
        )}
      </div>

      {/* 🔎 Búsqueda y Categorías */}
      <div className="sd-filters-bar">
        <div className="sd-search-input-wrapper">
          <span className="admin-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar productos (Ej: Hamburguesa, Pizza)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="sd-search-input"
          />
        </div>

        {categoriasComerciales.length > 1 && (
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="sd-select-filter"
          >
            {categoriasComerciales.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'todas' ? '🏷️ Todas las Categorías' : cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Listado de Productos Agrupados por Categoría */}
      {Object.keys(productosAgrupados).length === 0 ? (
        <div className="sd-state">
          <p className="admin-muted">🚫 No se encontraron productos que coincidan con los filtros aplicados.</p>
        </div>
      ) : (
        Object.entries(productosAgrupados).map(([categoria, prods]) => (
          <div key={categoria} className="sd-category-section">
            {/* Encabezado de la Categoría Comercial */}
            <h3 className="sd-category-title">
              🏷️ {categoria}
              <span className="sd-category-count">
                ({prods.length} {prods.length === 1 ? 'producto' : 'productos'})
              </span>
            </h3>

            {/* Grid de Productos dentro de la Categoría */}
            <div className="sd-products-grid">
              {prods.map((producto) => {
                const imagenCompleta = producto.imagen_url
                  ? `${API_URL}${producto.imagen_url}`
                  : null;

                return (
                  <div
                    key={producto.id}
                    className={`sd-product-card ${!estaAbiertoPorHorario ? 'sd-product-card--closed' : ''}`}
                  >
                    <div>
                      {/* 🖼️ Imagen del producto / Placeholder cuando no hay foto */}
                      <div className="sd-product-card__img-container">
                        {imagenCompleta ? (
                          <img
                            src={imagenCompleta}
                            alt={producto.nombre}
                            className="sd-product-card__img"
                          />
                        ) : (
                          <div className="sd-product-card__fallback">
                            <span>Imagen no disponible</span>
                          </div>
                        )}
                      </div>

                      {/* Nombre del producto */}
                      <h4 className="sd-product-card__title" style={{ marginTop: '12px' }}>
                        {producto.nombre}
                      </h4>

                      {/* Precio */}
                      <p className="sd-product-card__price" style={{ marginTop: '6px' }}>
                        ${Number(producto.precio).toFixed(2)}
                      </p>
                    </div>

                    {/* Botón ver detalles */}
                    <button
                      onClick={() => navigate(`/cliente/locales/producto/${producto.id}`)}
                      disabled={!estaAbiertoPorHorario}
                      className={`admin-btn admin-btn--sm admin-btn--block ${estaAbiertoPorHorario ? 'admin-btn--primary' : ''}`}
                      style={{ marginTop: '8px' }}
                    >
                      {estaAbiertoPorHorario ? '👁️ Ver detalles' : '🚫 No disponible (Cerrado)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};