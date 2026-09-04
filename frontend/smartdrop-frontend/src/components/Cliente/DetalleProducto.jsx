import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductoById } from '../../api/catalogService';
import { useCart } from '../../context/CartContext';
import { estaLocalAbierto } from '../../utils/horarios';

const API_URL = 'http://localhost:3000';

export const DetalleProducto = ({ onAgregarAlCarrito: propsAgregar }) => {
  const { productoId } = useParams();
  const navigate = useNavigate();
  const { agregarAlCarrito: contextAgregar } = useCart();
  const agregarFn = propsAgregar || contextAgregar;

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');

  // 🟢 Estructura: { [grupoId]: { [opcionId]: cantidad } }
  const [opcionesSeleccionadas, setOpcionesSeleccionadas] = useState({});

  useEffect(() => {
    const cargarProducto = async () => {
      try {
        const data = await getProductoById(productoId);
        setProducto(data);
      } catch (err) {
        console.error('Error al obtener el producto:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarProducto();
  }, [productoId]);

  if (loading) return <div>⏳ Cargando datos del producto...</div>;
  if (!producto) return <div>Producto no encontrado.</div>;

  const estaAbierto = producto.local
    ? estaLocalAbierto(producto.local, producto.local.horarios)
    : true;

  // 🟢 Modificar cantidad de una opción (para grupos con permitir_cantidad)
  const handleCantidadChange = (grupoId, opcionId, delta, maxGrupo) => {
    setOpcionesSeleccionadas((prev) => {
      const grupoActual = prev[grupoId] || {};
      const totalSeleccionado = Object.values(grupoActual).reduce((sum, cant) => sum + cant, 0);
      const cantidadActual = grupoActual[opcionId] || 0;

      if (delta > 0 && totalSeleccionado >= maxGrupo) {
        alert(`Ya alcanzaste el límite máximo de ${maxGrupo} selecciones para este grupo.`);
        return prev;
      }

      const nuevaCantidad = Math.max(0, cantidadActual + delta);
      const nuevoGrupo = { ...grupoActual };

      if (nuevaCantidad > 0) {
        nuevoGrupo[opcionId] = nuevaCantidad;
      } else {
        delete nuevoGrupo[opcionId];
      }

      return {
        ...prev,
        [grupoId]: nuevoGrupo
      };
    });
  };

  // 🟢 Handler tradicional para radiobuttons/checkboxes sin cantidad
  const handleOptionToggle = (grupoId, opcionId, esMultiple, maxSeleccion) => {
    setOpcionesSeleccionadas((prev) => {
      const grupoActual = prev[grupoId] || {};
      const estaSeleccionado = Boolean(grupoActual[opcionId]);
      const totalSeleccionados = Object.values(grupoActual).reduce((sum, cant) => sum + cant, 0);

      if (esMultiple) {
        const nuevoGrupo = { ...grupoActual };
        if (estaSeleccionado) {
          delete nuevoGrupo[opcionId];
        } else {
          if (totalSeleccionados >= maxSeleccion) {
            alert(`Ya alcanzaste el límite máximo de ${maxSeleccion} opciones para este grupo.`);
            return prev;
          }
          nuevoGrupo[opcionId] = 1;
        }
        return { ...prev, [grupoId]: nuevoGrupo };
      } else {
        return {
          ...prev,
          [grupoId]: { [opcionId]: 1 }
        };
      }
    });
  };

  // 🟢 Mapear las opciones seleccionadas incluyendo la cantidad de cada una
  const getOpcionesDetalladas = () => {
    if (!producto || !producto.grupos_opciones) return [];

    const opciones = [];

    producto.grupos_opciones.forEach((grupo) => {
      const seleccionados = opcionesSeleccionadas[grupo.id] || {};
      (grupo.opciones || []).forEach((opc) => {
        if (seleccionados[opc.id]) {
          opciones.push({
            ...opc,
            cantidad: seleccionados[opc.id]
          });
        }
      });
    });

    return opciones;
  };

  const opcionesDetalladas = getOpcionesDetalladas();

  // Calcular precio multiplicando adicional por la cantidad seleccionada
  const totalAdicionales = opcionesDetalladas.reduce(
    (sum, op) => sum + Number(op.precio_adicional || 0) * op.cantidad,
    0
  );

  const precioUnitarioTotal = Number(producto?.precio || 0) + totalAdicionales;

  const handleAgregar = () => {
    if (!producto) return;

    if (!estaAbierto) {
      alert('🔴 Local cerrado. Puedes explorar el menú, pero no es posible realizar pedidos');
      return;
    }

    // Validar mínimos
    for (const grupo of producto.grupos_opciones || []) {
      const seleccionados = opcionesSeleccionadas[grupo.id] || {};
      const totalUnidades = Object.values(seleccionados).reduce((sum, cant) => sum + cant, 0);

      if (grupo.obligatorio && totalUnidades < (grupo.min_seleccion || 1)) {
        alert(`Debes seleccionar al menos ${grupo.min_seleccion || 1} opción(es) en "${grupo.nombre}".`);
        return;
      }
    }

    const itemConfigurado = {
      ...producto,
      precioUnitarioTotal,
      totalAdicionales,
      comentario: comentario.trim(),
      opcionesDetalladas,
      opcionesIds: opcionesDetalladas.map((op) => op.id)
    };

    if (agregarFn) {
      agregarFn(itemConfigurado);
    }

    alert('Producto añadido al carrito exitosamente');
    navigate(-1);
  };

  // 🖼️ Armado de la URL completa de la imagen si está disponible
  const imagenCompleta = producto.imagen_url ? `${API_URL}${producto.imagen_url}` : null;

  return (
    <div style={{ maxWidth: '600px', margin: '1rem auto', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>

      {/* 🖼️ Renderizado de Imagen del Producto */}
      {imagenCompleta && (
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <img
            src={imagenCompleta}
            alt={producto.nombre}
            style={{
              width: '100%',
              maxWidth: '350px',
              height: '200px',
              objectFit: 'cover',
              borderRadius: '8px'
            }}
          />
        </div>
      )}

      <h2>{producto.nombre}</h2>

      {!estaAbierto && (
        <div style={{ padding: '0.8rem', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9', color: '#e03131', borderRadius: '6px', marginBottom: '1rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
          🔴 Local cerrado. Puedes explorar el menú, pero no es posible realizar pedidos
        </div>
      )}

      <div style={{ margin: '0.5rem 0' }}>
        <span style={{ fontSize: '1.25rem', color: '#2b8a3e', fontWeight: 'bold' }}>
          ${precioUnitarioTotal.toFixed(2)}
        </span>
        {totalAdicionales > 0 && (
          <small style={{ color: '#666', marginLeft: '0.5rem' }}>
            (Base: ${Number(producto.precio).toFixed(2)} + Adicionales: ${totalAdicionales.toFixed(2)})
          </small>
        )}
      </div>

      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        ⏱️ Tiempo estimado: {producto.tiempo_preparacion_min || 15} minutos
      </p>

      {/* 🥗 Sección de Ingredientes */}
      {producto.ingredientes && producto.ingredientes.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '0.8rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #eee' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>🥗 Ingredientes:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#555', fontSize: '0.95rem' }}>
            {producto.ingredientes.map((ing, index) => (
              <li key={index}>
                {ing.nombre} {ing.cantidad ? `(${ing.cantidad})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grupos de Opciones */}
      {producto.grupos_opciones && producto.grupos_opciones.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Opciones disponibles</h3>
          {producto.grupos_opciones.map((grupo) => {
            const esMultiple = grupo.max_seleccion > 1;
            const permiteCantidad = Boolean(grupo.permitir_cantidad);
            const seleccionados = opcionesSeleccionadas[grupo.id] || {};
            const totalUnidadesGrupo = Object.values(seleccionados).reduce((sum, cant) => sum + cant, 0);

            return (
              <div
                key={grupo.id}
                style={{
                  marginBottom: '1rem',
                  padding: '0.8rem',
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>
                  {grupo.nombre} {grupo.obligatorio ? <span style={{ color: 'red' }}>*</span> : null}
                  <small style={{ fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
                    ({totalUnidadesGrupo} / {grupo.max_seleccion} seleccionados)
                  </small>
                </div>

                {grupo.opciones && grupo.opciones.map((opcion) => {
                  const cantidadActual = seleccionados[opcion.id] || 0;

                  return (
                    <div
                      key={opcion.id}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        margin: '0.5rem 0',
                        padding: '0.3rem 0',
                        borderBottom: '1px dashed #eee'
                      }}
                    >
                      <span>
                        {opcion.nombre}
                        {Number(opcion.precio_adicional) > 0 && ` (+$${Number(opcion.precio_adicional).toFixed(2)})`}
                      </span>

                      {permiteCantidad ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={!estaAbierto || cantidadActual === 0}
                            onClick={() => handleCantidadChange(grupo.id, opcion.id, -1, grupo.max_seleccion)}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>
                            {cantidadActual}
                          </span>
                          <button
                            type="button"
                            disabled={!estaAbierto || totalUnidadesGrupo >= grupo.max_seleccion}
                            onClick={() => handleCantidadChange(grupo.id, opcion.id, 1, grupo.max_seleccion)}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <input
                          type={esMultiple ? 'checkbox' : 'radio'}
                          name={`grupo_${grupo.id}`}
                          checked={cantidadActual > 0}
                          disabled={
                            !estaAbierto ||
                            (esMultiple && !cantidadActual && totalUnidadesGrupo >= grupo.max_seleccion)
                          }
                          onChange={() => handleOptionToggle(grupo.id, opcion.id, esMultiple, grupo.max_seleccion)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Comentario */}
      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>
          Aclaraciones / Comentario:
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={!estaAbierto}
          placeholder={estaAbierto ? "Ej: Sin queso, aderezo aparte..." : "Local cerrado"}
          rows={3}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
        />
      </div>

      <button
        onClick={handleAgregar}
        disabled={!estaAbierto}
        style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '0.8rem',
          backgroundColor: estaAbierto ? '#007bff' : '#adb5bd',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: estaAbierto ? 'pointer' : 'not-allowed'
        }}
      >
        {estaAbierto
          ? `🛒 Añadir al carrito ($${precioUnitarioTotal.toFixed(2)})`
          : '🔴 Local cerrado - No es posible realizar pedidos'}
      </button>
    </div>
  );
};