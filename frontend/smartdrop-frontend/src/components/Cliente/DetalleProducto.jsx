// src/components/Cliente/DetalleProducto.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductoById } from '../../api/catalogService';
import { useCart } from '../../context/CartContext';
import { estaLocalAbierto } from '../../utils/horarios';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados

const API_URL = 'http://localhost:3000';

export const DetalleProducto = ({ onAgregarAlCarrito: propsAgregar }) => {
  const { productoId } = useParams();
  const navigate = useNavigate();
  const { agregarAlCarrito: contextAgregar } = useCart();
  const agregarFn = propsAgregar || contextAgregar;

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

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

  if (loading) {
    return (
      <div className="sd-container">
        <div className="sd-state">
          <span className="sd-spinner"></span>
          <p>Cargando datos del producto...</p>
        </div>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="sd-container">
        <div className="sd-state sd-state--error">
          <span>⚠️ Producto no encontrado.</span>
        </div>
      </div>
    );
  }

  const estaAbierto = producto.local
    ? estaLocalAbierto(producto.local, producto.local.horarios)
    : true;

  const handleCantidadChange = (grupoId, opcionId, delta, maxGrupo) => {
    setErrorBanner('');
    setOpcionesSeleccionadas((prev) => {
      const grupoActual = prev[grupoId] || {};
      const totalSeleccionado = Object.values(grupoActual).reduce((sum, cant) => sum + cant, 0);
      const cantidadActual = grupoActual[opcionId] || 0;

      if (delta > 0 && totalSeleccionado >= maxGrupo) {
        setErrorBanner(`⚠️ Ya alcanzaste el límite máximo de ${maxGrupo} selecciones para este grupo.`);
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

  const handleOptionToggle = (grupoId, opcionId, esMultiple, maxSeleccion) => {
    setErrorBanner('');
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
            setErrorBanner(`⚠️ Ya alcanzaste el límite máximo de ${maxSeleccion} opciones para este grupo.`);
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

  const totalAdicionales = opcionesDetalladas.reduce(
    (sum, op) => sum + Number(op.precio_adicional || 0) * op.cantidad,
    0
  );

  const precioUnitarioTotal = Number(producto?.precio || 0) + totalAdicionales;

  const handleAgregar = () => {
    if (!producto) return;

    if (!estaAbierto) {
      setErrorBanner('🔴 Local cerrado. Puedes explorar el menú, pero no es posible realizar pedidos.');
      return;
    }

    for (const grupo of producto.grupos_opciones || []) {
      const seleccionados = opcionesSeleccionadas[grupo.id] || {};
      const totalUnidades = Object.values(seleccionados).reduce((sum, cant) => sum + cant, 0);

      if (grupo.obligatorio && totalUnidades < (grupo.min_seleccion || 1)) {
        setErrorBanner(`⚠️ Debes seleccionar al menos ${grupo.min_seleccion || 1} opción(es) en "${grupo.nombre}".`);
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

    navigate(-1);
  };

  const imagenCompleta = producto.imagen_url ? `${API_URL}${producto.imagen_url}` : null;

  return (
    <div className="sd-container">
      <div className="sd-product-detail">

        {errorBanner && (
          <div className="admin-banner admin-banner--error" role="alert">
            <span>⚠️</span>
            <span style={{ flex: 1 }}>{errorBanner}</span>
            <button onClick={() => setErrorBanner('')} className="admin-btn admin-btn--ghost admin-btn--sm">✕</button>
          </div>
        )}

        {imagenCompleta && (
          <div className="sd-product-detail__img-container">
            <img
              src={imagenCompleta}
              alt={producto.nombre}
              className="sd-product-detail__img"
            />
          </div>
        )}

        <div className="sd-product-detail__header">
          <h2>{producto.nombre}</h2>
          <div className="sd-product-detail__price">${precioUnitarioTotal.toFixed(2)}</div>
          {totalAdicionales > 0 && (
            <small className="sd-product-detail__meta">
              (Base: ${Number(producto.precio).toFixed(2)} + Adicionales:${totalAdicionales.toFixed(2)})
            </small>
          )}
        </div>

        {!estaAbierto && (
          <div className="admin-banner admin-banner--error" role="alert">
            <span>🔴</span>
            <span>Local cerrado. Puedes explorar el menú, pero no es posible realizar pedidos.</span>
          </div>
        )}

        <p className="sd-product-detail__meta">
          ⏱️ Tiempo estimado de preparación: {producto.tiempo_preparacion_min || 15} minutos
        </p>

        {producto.ingredientes && producto.ingredientes.length > 0 && (
          <div className="sd-product-section">
            <h4>🥗 Ingredientes:</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--sd-text-main)', fontSize: '0.875rem' }}>
              {producto.ingredientes.map((ing, index) => (
                <li key={index}>
                  {ing.nombre} {ing.cantidad ? `(${ing.cantidad})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {producto.grupos_opciones && producto.grupos_opciones.length > 0 && (
          <div>
            <h3 style={{ color: 'var(--sd-navy)', fontSize: '1.125rem', marginBottom: '12px' }}>Opciones disponibles</h3>
            {producto.grupos_opciones.map((grupo) => {
              const esMultiple = grupo.max_seleccion > 1;
              const permiteCantidad = Boolean(grupo.permitir_cantidad);
              const seleccionados = opcionesSeleccionadas[grupo.id] || {};
              const totalUnidadesGrupo = Object.values(seleccionados).reduce((sum, cant) => sum + cant, 0);

              return (
                <div key={grupo.id} className="sd-option-group">
                  <div className="sd-option-group__title">
                    <span>{grupo.nombre} {grupo.obligatorio && <span style={{ color: 'var(--sd-error)' }}>*</span>}</span>
                    <small className="admin-muted">({totalUnidadesGrupo} / {grupo.max_seleccion} seleccionados)</small>
                  </div>

                  {grupo.opciones && grupo.opciones.map((opcion) => {
                    const cantidadActual = seleccionados[opcion.id] || 0;

                    return (
                      <div key={opcion.id} className="sd-option-row">
                        <span>
                          {opcion.nombre}
                          {Number(opcion.precio_adicional) > 0 && ` (+$${Number(opcion.precio_adicional).toFixed(2)})`}
                        </span>

                        {permiteCantidad ? (
                          <div className="sd-qty-control">
                            <button
                              type="button"
                              disabled={!estaAbierto || cantidadActual === 0}
                              onClick={() => handleCantidadChange(grupo.id, opcion.id, -1, grupo.max_seleccion)}
                              className="sd-qty-btn"
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
                              className="sd-qty-btn"
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
                            style={{ width: '18px', height: '18px', accentColor: 'var(--sd-orange-action)', cursor: 'pointer' }}
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

        <div className="admin-field">
          <label className="admin-field__label">Aclaraciones / Comentario:</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={!estaAbierto}
            placeholder={estaAbierto ? "Ej: Sin queso, aderezo aparte..." : "Local cerrado"}
            rows={3}
            className="admin-textarea"
          />
        </div>

        <button
          onClick={handleAgregar}
          disabled={!estaAbierto}
          className="admin-btn admin-btn--primary admin-btn--block"
        >
          {estaAbierto
            ? `🛒 Añadir al carrito ($${precioUnitarioTotal.toFixed(2)})`
            : '🔴 Local cerrado - No es posible realizar pedidos'}
        </button>

      </div>
    </div>
  );
};