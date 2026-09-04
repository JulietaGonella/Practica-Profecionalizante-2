import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { estaLocalAbierto, obtenerResumenHorarios } from '../../utils/horarios';
import { getCategoriasComerciales } from '../../api/productService'; // 👈 Tu servicio API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const obtenerImagenLocal = (local) => {
  const imagen = local.logo_url || local.foto_url || local.banner_url;

  if (!imagen) return null;

  return imagen.startsWith('http') ? imagen : `${API_BASE_URL}${imagen}`;
};

export const LocalesLista = ({ locales = [] }) => {
  const navigate = useNavigate();

  // 🔍 Estados para filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [categoriasLista, setCategoriasLista] = useState([]);

  // Cargar catálogo de categorías comerciales desde la BD
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

  // 🔎 Filtrado y ordenamiento dinámico de locales
  const localesFiltrados = useMemo(() => {
    // 1️⃣ Filtrar la lista según activo, categoría y búsqueda
    const filtrados = locales.filter((local) => {
      // 0️⃣ Filtro de Activo: Descarta locales inactivos (es_activo === 0)
      const estaActivo = Number(local.es_activo ?? local.activo ?? 1) === 1;
      if (!estaActivo) return false;

      // 1. Filtro por Categoría Comercial
      const cumpleCategoria =
        categoriaSeleccionada === 'todas' ||
        (local.categorias && local.categorias.includes(categoriaSeleccionada));

      // 2. Filtro por Búsqueda
      const termino = busqueda.toLowerCase().trim();
      const coincideNombreLocal = local.nombre.toLowerCase().includes(termino);
      const coincideAlgunaCategoria = local.categorias?.some((cat) =>
        cat.toLowerCase().includes(termino)
      );

      const cumpleBusqueda =
        termino === '' || coincideNombreLocal || coincideAlgunaCategoria;

      return cumpleCategoria && cumpleBusqueda;
    });

    // 2️⃣ Ordenar: Locales Abiertos primero (true -> false)
    return filtrados.sort((a, b) => {
      const abiertoA = estaLocalAbierto(a, a.horarios);
      const abiertoB = estaLocalAbierto(b, b.horarios);

      if (abiertoA === abiertoB) return 0; // Si ambos están abiertos o cerrados, se mantiene su orden
      return abiertoA ? -1 : 1;            // Si 'a' está abierto, se ubica primero
    });
  }, [locales, busqueda, categoriaSeleccionada]);

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>🏪 Locales Disponibles</h2>

      {/* 🔎 Barra de Búsqueda y Filtro por Categorías de Comercio */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          placeholder="🔍 Buscar local o tipo de comida (Ej: Hamburguesas, Pizzería)..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            flex: '1',
            minWidth: '260px',
            padding: '0.6rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.95rem'
          }}
        />

        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          style={{
            padding: '0.6rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.95rem',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
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
        <p style={{ textAlign: 'center', color: '#666', margin: '2rem 0' }}>
          🚫 No se encontraron locales que coincidan con la búsqueda.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {localesFiltrados.map((local) => {
            const abierto = estaLocalAbierto(local, local.horarios);
            const imagenLocal = obtenerImagenLocal(local);
            const { diasInactivos, tieneDiasInactivos } = obtenerResumenHorarios(
              local.horarios
            );

            return (
              <div
                key={local.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.2rem',
                  backgroundColor: abierto ? '#ffffff' : '#f8f9fa',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: abierto ? 1 : 0.7
                }}
              >
                <div
                  style={{
                    height: '150px',
                    margin: '-1.2rem -1.2rem 1rem',
                    overflow: 'hidden',
                    borderRadius: '12px 12px 0 0',
                    backgroundColor: '#e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {imagenLocal ? (
                    <img
                      src={imagenLocal}
                      alt={`Imagen de ${local.nombre}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                      Sin imagen disponible
                    </span>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
                      {local.nombre}
                    </h3>

                    <span
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        backgroundColor: abierto ? '#e6fcf5' : '#fff5f5',
                        color: abierto ? '#099268' : '#e03131',
                        border: `1px solid ${abierto ? '#20c997' : '#ffc9c9'}`
                      }}
                    >
                      {abierto ? '🟢 Abierto' : '🔴 Cerrado'}
                    </span>
                  </div>

                  <p style={{ margin: '0.3rem 0', color: '#666', fontSize: '0.9rem' }}>
                    📍 {local.direccion}
                  </p>

                  {/* Etiquetas de categorías que vende el local */}
                  {local.categorias && local.categorias.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                      {local.categorias.map((cat) => (
                        <span
                          key={cat}
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {tieneDiasInactivos ? (
                    <p
                      style={{
                        margin: '0.5rem 0 0 0',
                        color: '#856404',
                        backgroundColor: '#fff3cd',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      🚫 <strong>Cerrado los días:</strong> {diasInactivos.join(', ')}
                    </p>
                  ) : (
                    <p
                      style={{
                        margin: '0.5rem 0 0 0',
                        color: '#2b8a3e',
                        fontSize: '0.8rem'
                      }}
                    >
                      ⚡ Abre todos los días de la semana
                    </p>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/cliente/locales/local/${local.id}`)}
                  style={{
                    marginTop: '1rem',
                    padding: '0.6rem 1rem',
                    backgroundColor: abierto ? '#2b8a3e' : '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {abierto ? '🍽️ Ver Menú' : '👁️ Ver Menú (Cerrado)'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};