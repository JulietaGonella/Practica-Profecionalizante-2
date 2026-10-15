// src/components/Local/GestionMenuLocal.jsx
import { useState, useEffect } from 'react';
import {
  getProductos,
  createProducto,
  updateProducto,
  toggleDisponibleProducto,
  getCategoriasComerciales,
  createCategoriaComercial
} from '../../api/productService';
import { Icon, Spinner, AvisoModal } from './LocalUI';
import './css/Local.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const COMISION_PORCENTAJE = 0.10; // 10% de comisión del sistema

const parseDisponible = (val) => {
  if (val === null || val === undefined) return 1;
  if (typeof val === 'object' && val.data) return val.data[0] === 1 ? 1 : 0;
  return Number(val) === 1 || val === true ? 1 : 0;
};

export const GestionMenuLocal = ({ localId }) => {
  const [productos, setProductos] = useState([]);
  const [categoriasComerciales, setCategoriasComerciales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState(null);

  // Categorías comerciales abiertas en el listado
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  const [crearNuevaCategoria, setCrearNuevaCategoria] = useState(false);
  const [nuevaCategoriaTexto, setNuevaCategoriaTexto] = useState('');

  // Estado para el archivo de imagen seleccionado y la vista previa
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // 🟢 Estado para el Modal Estético de Avisos (Reemplazo de los alert)
  const [modalAviso, setModalAviso] = useState(null); // { titulo: '', mensaje: '' }

  const formInicial = {
    nombre: '',
    precio: '', // Representa el precio neto deseado por el local
    tiempo_preparacion_min: 15,
    IDcategoria: 1,
    IDcategoria_comercial: '',
    imagen_url: '',
    ingredientes: [],
    grupos_opciones: []
  };

  const [form, setForm] = useState(formInicial);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData] = await Promise.all([
        getProductos(),
        getCategoriasComerciales()
      ]);
      const misProds = prodsData
        .filter((p) => String(p.IDlocal ?? p.idlocal) === String(localId))
        .map((p) => ({
          ...p,
          disponible: parseDisponible(p.disponible)
        }));
      setProductos(misProds);
      setCategoriasComerciales(catsData || []);
    } catch (err) {
      console.error('Error al cargar información:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localId) cargarDatos();
  }, [localId]);

  const toggleCategoria = (nombreCategoria) => {
    setCategoriasAbiertas((prev) => ({
      ...prev,
      [nombreCategoria]: !prev[nombreCategoria]
    }));
  };

  const handleToggleDisponible = async (id) => {
    setIsTogglingId(id);
    try {
      const res = await toggleDisponibleProducto(id);

      setProductos((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const nuevoEstadoBackend = res.disponible ?? res.es_activo ?? res.producto?.disponible;
            const nuevoDisponible = nuevoEstadoBackend !== undefined
              ? parseDisponible(nuevoEstadoBackend)
              : (p.disponible === 1 ? 0 : 1);

            return {
              ...p,
              disponible: nuevoDisponible
            };
          }
          return p;
        })
      );
    } catch (err) {
      // 🟢 Reemplazo del primer alert nativo
      setModalAviso({
        titulo: '⚠️ Error de Disponibilidad',
        mensaje: err.response?.data?.message || err.response?.data?.error || 'Error al cambiar disponibilidad'
      });
    } finally {
      setIsTogglingId(null);
    }
  };

  const addIngrediente = () => {
    setForm({ ...form, ingredientes: [...form.ingredientes, { nombre: '', cantidad: '' }] });
  };

  const updateIngrediente = (index, field, value) => {
    const newIng = [...form.ingredientes];
    newIng[index][field] = value;
    setForm({ ...form, ingredientes: newIng });
  };

  const removeIngrediente = (index) => {
    setForm({ ...form, ingredientes: form.ingredientes.filter((_, i) => i !== index) });
  };

  const addGrupoOpcion = () => {
    setForm({
      ...form,
      grupos_opciones: [
        ...form.grupos_opciones,
        {
          nombre: '',
          min_seleccion: 1,
          max_seleccion: 1,
          obligatorio: true,
          permitir_cantidad: false,
          opciones: []
        }
      ]
    });
  };

  const updateGrupoOpcion = (grupoIdx, field, value) => {
    const newGrupos = [...form.grupos_opciones];
    newGrupos[grupoIdx][field] = value;
    setForm({ ...form, grupos_opciones: newGrupos });
  };

  const removeGrupoOpcion = (grupoIdx) => {
    setForm({
      ...form,
      grupos_opciones: form.grupos_opciones.filter((_, i) => i !== grupoIdx)
    });
  };

  const addOpcionToGrupo = (grupoIdx) => {
    const newGrupos = [...form.grupos_opciones];
    newGrupos[grupoIdx].opciones.push({ nombre: '', precio_adicional: 0, disponible: 1 });
    setForm({ ...form, grupos_opciones: newGrupos });
  };

  const updateOpcionInGrupo = (grupoIdx, opcIdx, field, value) => {
    const newGrupos = [...form.grupos_opciones];
    newGrupos[grupoIdx].opciones[opcIdx][field] = value;
    setForm({ ...form, grupos_opciones: newGrupos });
  };

  const removeOpcionFromGrupo = (grupoIdx, opcIdx) => {
    const newGrupos = [...form.grupos_opciones];
    newGrupos[grupoIdx].opciones = newGrupos[grupoIdx].opciones.filter((_, i) => i !== opcIdx);
    setForm({ ...form, grupos_opciones: newGrupos });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenArchivo(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImagen = () => {
    setImagenArchivo(null);
    setPreviewUrl('');
    setForm((prev) => ({ ...prev, imagen_url: '' }));
  };

  const handleEditarClick = (prod) => {
    setEditingId(prod.id);
    setCrearNuevaCategoria(false);
    setNuevaCategoriaTexto('');
    setImagenArchivo(null);

    const fullImagenUrl = prod.imagen_url
      ? (prod.imagen_url.startsWith('http') ? prod.imagen_url : `${API_BASE_URL}${prod.imagen_url}`)
      : '';

    setPreviewUrl(fullImagenUrl);

    // Priorizar precio_local si existe, de lo contrario recuperar el neto del 90% del precio público.
    const valorPrecioLocal = prod.precio_local !== undefined && prod.precio_local !== null
      ? prod.precio_local
      : (prod.precio ? (Number(prod.precio) * (1 - COMISION_PORCENTAJE)).toFixed(2) : '');

    setForm({
      nombre: prod.nombre || '',
      precio: valorPrecioLocal,
      disponible: parseDisponible(prod.disponible),
      tiempo_preparacion_min: prod.tiempo_preparacion_min || 15,
      IDcategoria: prod.IDcategoria || 1,
      IDcategoria_comercial: prod.IDcategoria_comercial || '',
      imagen_url: prod.imagen_url || '',
      ingredientes: prod.ingredientes || [],
      grupos_opciones: (prod.grupos_opciones || []).map((g) => ({
        id: g.id,
        nombre: g.nombre,
        min_seleccion: g.min_seleccion,
        max_seleccion: g.max_seleccion,
        obligatorio: g.obligatorio,
        permitir_cantidad: Boolean(g.permitir_cantidad),
        opciones: (g.opciones || []).map((o) => ({
          id: o.id,
          nombre: o.nombre,
          precio_adicional: o.precio_adicional,
          disponible: parseDisponible(o.disponible)
        }))
      }))
    });
    setMostrarForm(true);
  };

  const cerrarModal = () => {
    if (isSaving) return;
    setMostrarForm(false);
    setEditingId(null);
    setCrearNuevaCategoria(false);
    setNuevaCategoriaTexto('');
    setImagenArchivo(null);
    setPreviewUrl('');
    setForm(formInicial);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let idCategoriaComercialFinal = form.IDcategoria_comercial ? Number(form.IDcategoria_comercial) : null;

      if (crearNuevaCategoria && nuevaCategoriaTexto.trim() !== '') {
        const catCreada = await createCategoriaComercial({ nombre: nuevaCategoriaTexto.trim() });
        idCategoriaComercialFinal = catCreada.id;
      }

      const formData = new FormData();
      formData.append('nombre', form.nombre);
      // 'precio' enviado al backend es el monto neto que desea recibir el local
      formData.append('precio', Number(form.precio));
      formData.append('disponible', form.disponible !== undefined ? parseDisponible(form.disponible) : 1);
      formData.append('tiempo_preparacion_min', Number(form.tiempo_preparacion_min));
      formData.append('IDcategoria', Number(form.IDcategoria));

      if (idCategoriaComercialFinal) {
        formData.append('IDcategoria_comercial', idCategoriaComercialFinal);
      }

      formData.append('ingredientes', JSON.stringify(form.ingredientes));
      formData.append('grupos_opciones', JSON.stringify(form.grupos_opciones));

      if (imagenArchivo) {
        formData.append('imagen', imagenArchivo);
      } else {
        formData.append('imagen_url', form.imagen_url || '');
      }

      if (editingId) {
        await updateProducto(editingId, formData);
        // 🟢 Reemplazo del segundo alert nativo (actualización exitosa)
        setModalAviso({
          titulo: '✓ Producto Actualizado',
          mensaje: 'El producto fue actualizado exitosamente.'
        });
      } else {
        await createProducto(formData);
        // 🟢 Reemplazo del tercer alert nativo (creación exitosa)
        setModalAviso({
          titulo: '✓ Producto Creado',
          mensaje: 'El producto fue creado exitosamente.'
        });
      }
      cerrarModal();
      await cargarDatos();
    } catch (err) {
      // 🟢 Reemplazo del cuarto alert nativo (error al guardar)
      setModalAviso({
        titulo: '⚠️ Error al Guardar',
        mensaje: err.response?.data?.error || err.response?.data?.message || 'Error al guardar el producto'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cálculo de la vista previa del desglose financiero
  const precioLocalNum = Number(form.precio) || 0;
  const precioFinalCalculado = Number((precioLocalNum / (1 - COMISION_PORCENTAJE)).toFixed(2));
  const montoComision = Number((precioFinalCalculado - precioLocalNum).toFixed(2));

  // Agrupar productos por Categoría Comercial y ordenar por nombre
  const productosAgrupados = productos.reduce((acc, prod) => {
    const catComercial = categoriasComerciales.find(
      (c) => String(c.id) === String(prod.IDcategoria_comercial)
    );

    const nombreCategoria = catComercial
      ? catComercial.nombre
      : 'Otras / Sin Categoría Comercial';

    if (!acc[nombreCategoria]) {
      acc[nombreCategoria] = [];
    }

    acc[nombreCategoria].push(prod);
    return acc;
  }, {});

  // Ordenar alfabéticamente los productos dentro de cada categoría
  Object.keys(productosAgrupados).forEach((cat) => {
    productosAgrupados[cat].sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  });

  return (
    <section className="local-section">
      <div className="local-section-head">
        <h2 className="local-title">
          <span className="local-title__icon"><Icon name="utensils" size={20} /></span>
          Gestión de productos y menú
        </h2>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            setEditingId(null);
            setForm(formInicial);
            setCrearNuevaCategoria(false);
            setNuevaCategoriaTexto('');
            setImagenArchivo(null);
            setPreviewUrl('');
            setMostrarForm(true);
          }}
          className="local-btn local-btn--primary"
        >
          <Icon name="plus" />
          Nuevo producto
        </button>
      </div>

      {mostrarForm && (
        <div className="local-modal-overlay">
          <div
            className="local-modal local-modal--lg"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? 'Editar producto' : 'Crear nuevo producto'}
          >
            <div className="local-modal__head">
              <h3>{editingId ? 'Editar producto' : 'Crear nuevo producto'}</h3>
              <button
                type="button"
                onClick={cerrarModal}
                disabled={isSaving}
                className="local-icon-btn"
                aria-label="Cerrar"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Datos generales */}
              <div className="local-grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
                <label className="local-field">
                  <span>Nombre del producto</span>
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="local-input"
                  />
                </label>
                <label className="local-field">
                  <span>Precio que querés recibir por producto ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isSaving}
                    placeholder="Ej: 1000"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    className="local-input"
                  />
                </label>
              </div>

              {/* Tarjeta informativa del cálculo de la comisión del 10% */}
              {precioLocalNum > 0 && (
                <div className="local-breakdown">
                  <div className="local-breakdown__title">
                    <Icon name="info" size={16} />
                    Desglose del precio (10% del precio cobrado)
                  </div>
                  <div className="local-breakdown__row">
                    <span>Ganancia neta para tu local</span>
                    <strong>${precioLocalNum.toFixed(2)}</strong>
                  </div>
                  <div className="local-breakdown__row">
                    <span>Comisión plataforma (10%)</span>
                    <span>+${montoComision.toFixed(2)}</span>
                  </div>
                  <div className="local-breakdown__row local-breakdown__row--total">
                    <span>Precio final al cliente en la app</span>
                    <span>${precioFinalCalculado.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Imagen del producto */}
              <div className="local-field local-file" style={{ marginTop: '20px' }}>
                <span className="local-field__label">Imagen del producto</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isSaving}
                  onChange={handleFileChange}
                  aria-label="Imagen del producto"
                />

                {previewUrl && (
                  <div className="local-preview">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImagen}
                      className="local-btn local-btn--sm local-btn--danger-soft"
                    >
                      <Icon name="trash" size={14} />
                      Eliminar imagen
                    </button>
                  </div>
                )}
              </div>

              {/* Tiempos y categorías */}
              <div className="local-grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', marginTop: '20px' }}>
                <label className="local-field">
                  <span>Tiempo de preparación (min)</span>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={isSaving}
                    value={form.tiempo_preparacion_min}
                    onChange={(e) => setForm({ ...form, tiempo_preparacion_min: e.target.value })}
                    className="local-input"
                  />
                </label>

                <label className="local-field">
                  <span>Categoría técnica</span>
                  <select
                    disabled={isSaving}
                    value={form.IDcategoria}
                    onChange={(e) => setForm({ ...form, IDcategoria: e.target.value })}
                    className="local-select"
                  >
                    <option value={1}>Panadería y Secos</option>
                    <option value={2}>Bebidas</option>
                    <option value={3}>Comida Caliente</option>
                    <option value={4}>Fritos y Crujientes</option>
                    <option value={5}>Helados y Postres Fríos</option>
                  </select>
                </label>

                <div className="local-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span className="local-field__label">Categoría comercial</span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setCrearNuevaCategoria(!crearNuevaCategoria);
                        setNuevaCategoriaTexto('');
                      }}
                      className="local-link-btn"
                    >
                      {crearNuevaCategoria ? 'Seleccionar existente' : 'Crear nueva'}
                    </button>
                  </div>

                  {crearNuevaCategoria ? (
                    <input
                      type="text"
                      placeholder="Ej: Picadas, Ensaladas..."
                      aria-label="Nombre de la nueva categoría comercial"
                      required
                      disabled={isSaving}
                      value={nuevaCategoriaTexto}
                      onChange={(e) => setNuevaCategoriaTexto(e.target.value)}
                      className="local-input local-input--accent"
                    />
                  ) : (
                    <select
                      disabled={isSaving}
                      aria-label="Categoría comercial"
                      value={form.IDcategoria_comercial}
                      onChange={(e) => setForm({ ...form, IDcategoria_comercial: e.target.value })}
                      className="local-select"
                    >
                      <option value="">-- Seleccionar --</option>
                      {categoriasComerciales.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Ingredientes */}
              <div className="local-fieldset">
                <h4><Icon name="list" size={18} /> Ingredientes incluidos</h4>
                {form.ingredientes.map((ing, idx) => (
                  <div key={idx} className="local-row">
                    <input
                      placeholder="Ej: Queso Mozzarella"
                      aria-label="Nombre del ingrediente"
                      disabled={isSaving}
                      value={ing.nombre}
                      onChange={(e) => updateIngrediente(idx, 'nombre', e.target.value)}
                      className="local-input local-input--sm"
                    />
                    <input
                      placeholder="Ej: 200g"
                      aria-label="Cantidad del ingrediente"
                      disabled={isSaving}
                      value={ing.cantidad}
                      onChange={(e) => updateIngrediente(idx, 'cantidad', e.target.value)}
                      className="local-input local-input--sm"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => removeIngrediente(idx)}
                      className="local-icon-btn local-icon-btn--danger"
                      aria-label="Quitar ingrediente"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={addIngrediente}
                    className="local-btn local-btn--sm local-btn--outline"
                  >
                    <Icon name="plus" size={14} />
                    Agregar ingrediente
                  </button>
                </div>
              </div>

              {/* Grupos de opciones */}
              <div className="local-fieldset">
                <h4><Icon name="tag" size={18} /> Grupos de opciones / gustos</h4>
                {form.grupos_opciones.map((grupo, gIdx) => (
                  <div key={gIdx} className="local-group">
                    <div className="local-group__head">
                      <input
                        placeholder="Nombre del grupo (Ej: Gustos de Helado)"
                        aria-label="Nombre del grupo de opciones"
                        disabled={isSaving}
                        value={grupo.nombre}
                        onChange={(e) => updateGrupoOpcion(gIdx, 'nombre', e.target.value)}
                        className="local-input"
                      />

                      <label className="local-check">
                        <input
                          type="checkbox"
                          disabled={isSaving}
                          checked={grupo.obligatorio}
                          onChange={(e) => updateGrupoOpcion(gIdx, 'obligatorio', e.target.checked)}
                        />
                        Obligatorio
                      </label>

                      <label className="local-check">
                        <input
                          type="checkbox"
                          disabled={isSaving}
                          checked={grupo.permitir_cantidad || false}
                          onChange={(e) => updateGrupoOpcion(gIdx, 'permitir_cantidad', e.target.checked)}
                        />
                        Acumular cantidad por opción
                      </label>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => removeGrupoOpcion(gIdx)}
                        className="local-btn local-btn--sm local-btn--danger-soft"
                        style={{ marginLeft: 'auto' }}
                      >
                        <Icon name="trash" size={14} />
                        Eliminar grupo
                      </button>
                    </div>

                    <div className="local-group__limits">
                      <label>
                        Mín. selección
                        <input
                          type="number"
                          disabled={isSaving}
                          value={grupo.min_seleccion}
                          onChange={(e) => updateGrupoOpcion(gIdx, 'min_seleccion', Number(e.target.value))}
                          className="local-input local-input--sm"
                        />
                      </label>
                      <label>
                        Máx. selección
                        <input
                          type="number"
                          disabled={isSaving}
                          value={grupo.max_seleccion}
                          onChange={(e) => updateGrupoOpcion(gIdx, 'max_seleccion', Number(e.target.value))}
                          className="local-input local-input--sm"
                        />
                      </label>
                    </div>

                    <div className="local-group__options">
                      <h5>Opciones / sabores pertenecientes</h5>
                      {grupo.opciones.map((opc, oIdx) => {
                        const opcDisponible = parseDisponible(opc.disponible) === 1;

                        return (
                          <div key={oIdx} className="local-row local-row--option">
                            <input
                              placeholder="Ej: Dulce de Leche"
                              aria-label="Nombre de la opción"
                              disabled={isSaving}
                              value={opc.nombre}
                              onChange={(e) => updateOpcionInGrupo(gIdx, oIdx, 'nombre', e.target.value)}
                              className="local-input local-input--sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              disabled={isSaving}
                              placeholder="Adicional (+ $0)"
                              aria-label="Precio adicional"
                              value={opc.precio_adicional}
                              onChange={(e) => updateOpcionInGrupo(gIdx, oIdx, 'precio_adicional', e.target.value)}
                              className="local-input local-input--sm"
                            />

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => {
                                const nuevoEstado = opcDisponible ? 0 : 1;
                                updateOpcionInGrupo(gIdx, oIdx, 'disponible', nuevoEstado);
                              }}
                              className={`local-btn local-btn--sm ${opcDisponible ? 'local-btn--success-soft' : 'local-btn--danger-soft'}`}
                            >
                              <Icon name={opcDisponible ? 'checkCircle' : 'xCircle'} size={14} />
                              {opcDisponible ? 'Disponible' : 'Agotado'}
                            </button>

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => removeOpcionFromGrupo(gIdx, oIdx)}
                              className="local-icon-btn local-icon-btn--danger"
                              aria-label="Quitar opción"
                            >
                              <Icon name="x" size={16} />
                            </button>
                          </div>
                        );
                      })}
                      <div>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => addOpcionToGrupo(gIdx)}
                          className="local-btn local-btn--sm local-btn--outline"
                        >
                          <Icon name="plus" size={14} />
                          Añadir sabor / opción
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={addGrupoOpcion}
                    className="local-btn local-btn--sm local-btn--navy"
                  >
                    <Icon name="plus" size={14} />
                    Crear grupo de opciones
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="local-modal__foot">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={isSaving}
                  className="local-btn local-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="local-btn local-btn--primary"
                >
                  {isSaving ? (
                    <><Spinner /> Guardando...</>
                  ) : (
                    <><Icon name="save" /> Guardar producto</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aviso general: flota sobre el modal de formulario */}
      {modalAviso && (
        <AvisoModal
          titulo={modalAviso.titulo}
          mensaje={modalAviso.mensaje}
          exito={modalAviso.titulo.includes('✓')}
          onClose={() => setModalAviso(null)}
        />
      )}

      {/* Productos organizados por categorías comerciales */}
      {loading ? (
        <div className="local-state" role="status">
          <Spinner />
          Cargando productos...
        </div>
      ) : Object.keys(productosAgrupados).length === 0 ? (
        <div className="local-state">
          <Icon name="utensils" size={28} />
          <p>No hay productos registrados en el menú.</p>
        </div>
      ) : (
        <div className="local-menu-list">
          {Object.entries(productosAgrupados).map(
            ([nombreCategoria, listaProductos]) => (
              <div
                key={nombreCategoria}
                className={`local-cat ${categoriasAbiertas[nombreCategoria] ? 'is-open' : ''}`}
              >
                {/* Encabezado desplegable de la categoría comercial */}
                <button
                  type="button"
                  onClick={() => toggleCategoria(nombreCategoria)}
                  className="local-cat__head"
                  aria-expanded={Boolean(categoriasAbiertas[nombreCategoria])}
                >
                  <span className="local-cat__title">
                    <Icon name={categoriasAbiertas[nombreCategoria] ? 'chevronDown' : 'chevronRight'} size={18} />
                    <span className="local-icon tag" style={{ display: 'inline-flex' }}><Icon name="tag" size={16} /></span>
                    {nombreCategoria}
                  </span>

                  <span className="local-badge local-badge--neutral">
                    {listaProductos.length}{' '}
                    {listaProductos.length === 1 ? 'producto' : 'productos'}
                  </span>
                </button>

                {/* Contenido desplegable de la categoría */}
                {categoriasAbiertas[nombreCategoria] && (
                  <div className="local-table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                    <table className="local-table local-table--stack">
                      <thead>
                        <tr>
                          <th style={{ width: '72px' }}>Imagen</th>
                          <th>Producto</th>
                          <th>Precio venta (neto local)</th>
                          <th>Prep.</th>
                          <th>Estado</th>
                          <th className="is-right">Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {listaProductos.map((prod) => {
                          const estaEditandoEste = editingId === prod.id;
                          const estaCambiandoEste = isTogglingId === prod.id;
                          const estaDisponible = parseDisponible(prod.disponible) === 1;

                          const precioLocalVal =
                            prod.precio_local !== undefined &&
                            prod.precio_local !== null
                              ? Number(prod.precio_local)
                              : Number(
                                  (
                                    Number(prod.precio) *
                                    (1 - COMISION_PORCENTAJE)
                                  ).toFixed(2)
                                );

                          return (
                            <tr key={prod.id} className={estaEditandoEste ? 'is-editing' : ''}>
                              <td data-label="Imagen">
                                <img
                                  className="local-product-img"
                                  src={
                                    prod.imagen_url &&
                                    prod.imagen_url.trim() !== ''
                                      ? prod.imagen_url.startsWith('http')
                                        ? prod.imagen_url
                                        : `${API_BASE_URL}${prod.imagen_url}`
                                      : 'https://placehold.co/50x50?text=Sin+Foto'
                                  }
                                  alt={prod.nombre}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src =
                                      'https://placehold.co/50x50?text=Sin+Foto';
                                  }}
                                />
                              </td>

                              <td data-label="Producto" className="is-strong">
                                {prod.nombre}
                              </td>

                              <td data-label="Precio">
                                <div className="local-price">
                                  <strong>${Number(prod.precio).toFixed(2)}</strong>
                                  <small>(Neto local: ${precioLocalVal.toFixed(2)})</small>
                                </div>
                              </td>

                              <td data-label="Prep.">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <Icon name="timer" size={14} />
                                  {prod.tiempo_preparacion_min || 15}m
                                </span>
                              </td>

                              <td data-label="Estado">
                                {estaDisponible ? (
                                  <span className="local-badge local-badge--success">
                                    <Icon name="checkCircle" size={12} /> Disponible
                                  </span>
                                ) : (
                                  <span className="local-badge local-badge--error">
                                    <Icon name="pause" size={12} /> Pausado
                                  </span>
                                )}
                              </td>

                              <td data-label="Acciones" className="is-right local-table__actions">
                                <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleEditarClick(prod)}
                                    disabled={isSaving || Boolean(isTogglingId)}
                                    className="local-btn local-btn--sm local-btn--outline"
                                  >
                                    <Icon name="pencil" size={14} />
                                    Editar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleDisponible(prod.id)}
                                    disabled={estaCambiandoEste || isSaving}
                                    className="local-btn local-btn--sm local-btn--outline"
                                  >
                                    {estaCambiandoEste ? (
                                      <><Spinner /> Procesando...</>
                                    ) : estaDisponible ? (
                                      <><Icon name="pause" size={14} /> Pausar</>
                                    ) : (
                                      <><Icon name="play" size={14} /> Activar</>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
};