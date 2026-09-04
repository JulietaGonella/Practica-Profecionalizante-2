import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { estaLocalAbierto } from '../../utils/horarios';

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
      .filter(
        (cat) =>
          Boolean(cat) &&
          cat !== 'Sin Categoría'
      );

    return [
      'todas',
      ...new Set(listaCategorias)
    ];
  }, [productosDelLocal]);

  // 3️⃣ Filtrar productos
  const productosFiltrados = useMemo(() => {
    return productosDelLocal.filter((producto) => {
      const coincideNombre = producto.nombre
        .toLowerCase()
        .includes(
          busqueda.toLowerCase().trim()
        );

      const catComercial =
        getCategoriaComercial(producto);

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

  // ⏳ Cargando
  if (cargandoLocales || cargandoProductos) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#495057'
        }}
      >
        <h2>⏳ Cargando catálogo del local...</h2>
        <p>Por favor aguarde un momento.</p>
      </div>
    );
  }

  // ❌ Local inexistente
  if (!local) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          color: '#e03131'
        }}
      >
        <p>
          El local solicitado no existe o se encuentra inactivo.
        </p>
      </div>
    );
  }

  return (
    <div>

      {/* Banner del Local */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: estaAbiertoPorHorario
            ? '#e6fcf5'
            : '#fff5f5',
          borderLeft: `5px solid ${
            estaAbiertoPorHorario
              ? '#099268'
              : '#e03131'
          }`,
          borderRadius: '8px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#2c3e50'
            }}
          >
            {local.nombre}
          </h2>

          <span
            style={{
              fontWeight: 'bold',
              color: estaAbiertoPorHorario
                ? '#099268'
                : '#e03131'
            }}
          >
            {estaAbiertoPorHorario
              ? '🟢 Abierto'
              : '🔴 Cerrado fuera de horario'}
          </span>
        </div>

        <p
          style={{
            margin: '0.3rem 0 0 0',
            color: '#495057'
          }}
        >
          📍 {local.direccion}
        </p>

        {!estaAbiertoPorHorario && (
          <p
            style={{
              margin: '0.5rem 0 0 0',
              color: '#e03131',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            ⚠️ El local se encuentra fuera de su horario de atención.
            Puedes explorar la carta, pero los botones de compra se
            encuentran inactivos.
          </p>
        )}
      </div>

      {/* 🔎 Búsqueda y Categorías */}
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
          placeholder="🔍 Buscar productos (Ej: Hamburguesa, Pizza)..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(e.target.value)
          }
          style={{
            flex: '1',
            minWidth: '220px',
            padding: '0.6rem 1rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.95rem'
          }}
        />

        {categoriasComerciales.length > 1 && (
          <select
            value={categoriaSeleccionada}
            onChange={(e) =>
              setCategoriaSeleccionada(e.target.value)
            }
            style={{
              padding: '0.6rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '0.95rem',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {categoriasComerciales.map((cat) => (
              <option
                key={cat}
                value={cat}
              >
                {cat === 'todas'
                  ? '🏷️ Todas las Categorías'
                  : cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Listado de Productos */}
      {productosFiltrados.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            color: '#666',
            margin: '2rem 0'
          }}
        >
          🚫 No se encontraron productos que coincidan
          con los filtros aplicados.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem'
          }}
        >
          {productosFiltrados.map((producto) => {
            const catNombre =
              getCategoriaComercial(producto);

            // 🖼️ Construir URL completa de la imagen
            const imagenCompleta =
              producto.imagen_url
                ? `${API_URL}${producto.imagen_url}`
                : null;

            return (
              <div
                key={producto.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  opacity: estaAbiertoPorHorario
                    ? 1
                    : 0.7,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>

                  {/* 🖼️ Imagen del producto */}
                  {imagenCompleta && (
                    <img
                      src={imagenCompleta}
                      alt={producto.nombre}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        marginBottom: '0.8rem'
                      }}
                    />
                  )}

                  {/* Nombre + categoría */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <h4
                      style={{
                        margin: '0 0 0.5rem 0'
                      }}
                    >
                      {producto.nombre}
                    </h4>

                    {catNombre &&
                      catNombre !== 'Sin Categoría' && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: '#e9ecef',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}
                        >
                          🍔 {catNombre}
                        </span>
                      )}
                  </div>

                  {/* Precio */}
                  <p
                    style={{
                      fontWeight: 'bold',
                      color: '#2b8a3e',
                      margin: '0.3rem 0'
                    }}
                  >
                    ${Number(producto.precio).toFixed(2)}
                  </p>
                </div>

                {/* Botón */}
                <button
                  onClick={() =>
                    navigate(
                      `/cliente/locales/producto/${producto.id}`
                    )
                  }
                  disabled={!estaAbiertoPorHorario}
                  style={{
                    marginTop: '0.8rem',
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor:
                      estaAbiertoPorHorario
                        ? '#1c7ed6'
                        : '#adb5bd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor:
                      estaAbiertoPorHorario
                        ? 'pointer'
                        : 'not-allowed',
                    fontWeight: 'bold'
                  }}
                >
                  {estaAbiertoPorHorario
                    ? '👁️ Ver detalles'
                    : '🚫 No disponible (Cerrado)'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};