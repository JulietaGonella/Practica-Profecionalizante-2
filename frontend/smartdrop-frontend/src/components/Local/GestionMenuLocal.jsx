import { useState, useEffect } from 'react';
import {
  getProductos,
  createProducto,
  updateProducto,
  toggleDisponibleProducto,
  getCategoriasComerciales,
  createCategoriaComercial
} from '../../api/productService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  const [crearNuevaCategoria, setCrearNuevaCategoria] = useState(false);
  const [nuevaCategoriaTexto, setNuevaCategoriaTexto] = useState('');

  // 1. Estado para almacenar el archivo seleccionado y la vista previa
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const formInicial = {
    nombre: '',
    precio: '',
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
      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al cambiar disponibilidad'
      );
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

  // 2. Controlar la selección del archivo de imagen
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

    // Prepara la URL completa para la vista previa
    const fullImagenUrl = prod.imagen_url
      ? (prod.imagen_url.startsWith('http') ? prod.imagen_url : `${API_BASE_URL}${prod.imagen_url}`)
      : '';

    setPreviewUrl(fullImagenUrl);

    setForm({
      nombre: prod.nombre || '',
      precio: prod.precio || '',
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

  // 3. Envío adaptado a FormData
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
      formData.append('precio', Number(form.precio));
      formData.append('disponible', form.disponible !== undefined ? parseDisponible(form.disponible) : 1);
      formData.append('tiempo_preparacion_min', Number(form.tiempo_preparacion_min));
      formData.append('IDcategoria', Number(form.IDcategoria));

      if (idCategoriaComercialFinal) {
        formData.append('IDcategoria_comercial', idCategoriaComercialFinal);
      }

      // Convertir estructuras complejas a JSON string para enviarlas con FormData
      formData.append('ingredientes', JSON.stringify(form.ingredientes));
      formData.append('grupos_opciones', JSON.stringify(form.grupos_opciones));

      // Adjuntar la imagen con la clave 'imagen' coincidente con multer (upload.single('imagen'))
      if (imagenArchivo) {
        formData.append('imagen', imagenArchivo);
      } else {
        // Si no hay archivo cargado y el estado imagen_url está vacío, enviar vacío para limpiar en BD
        formData.append('imagen_url', form.imagen_url || '');
      }

      if (editingId) {
        await updateProducto(editingId, formData);
        alert('Producto actualizado exitosamente');
      } else {
        await createProducto(formData);
        alert('Producto creado exitosamente');
      }
      cerrarModal();
      await cargarDatos();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Error al guardar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🍕 Gestión de Productos y Menú</h2>
        <button
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
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: '#2b8a3e',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ➕ Nuevo Producto
        </button>
      </div>

      {mostrarForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.8rem',
              boxShadow: '0px 10px 25px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{editingId ? '✏️ Editar Producto' : '➕ Crear Nuevo Producto'}</h3>
              <button
                type="button"
                onClick={cerrarModal}
                disabled={isSaving}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                ❌
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Datos Generales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}><strong>Nombre del Producto:</strong></label>
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}><strong>Precio Base ($):</strong></label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={isSaving}
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Imagen del Producto mediante archivo local */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                  <strong>📷 Imagen del Producto:</strong>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isSaving}
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />

                {/* Vista previa de la imagen actual o nueva */}
                {previewUrl && (
                  <div style={{ marginTop: '0.8rem', textAlign: 'center', position: 'relative', display: 'inline-block' }}>
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImagen}
                      style={{
                        display: 'block',
                        margin: '0.4rem auto 0',
                        backgroundColor: '#ff4d4f',
                        color: '#fff',
                        border: 'none',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      🗑️ Eliminar Imagen
                    </button>
                  </div>
                )}
              </div>

              {/* Tiempos y Categorías */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}><strong>⏱️ Tiempo Prep. (Mins):</strong></label>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={isSaving}
                    value={form.tiempo_preparacion_min}
                    onChange={(e) => setForm({ ...form, tiempo_preparacion_min: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}><strong>📦 Cat. Técnica:</strong></label>
                  <select
                    disabled={isSaving}
                    value={form.IDcategoria}
                    onChange={(e) => setForm({ ...form, IDcategoria: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: '#fff' }}
                  >
                    <option value={1}>📦 Normal / Ambiente</option>
                    <option value={2}>🔥 Caliente (Pizzas, Pastas)</option>
                    <option value={3}>🍟 Frito / Sensible</option>
                    <option value={4}>🍦 Frío / Congelado (Helados)</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.9rem', margin: 0 }}><strong>🍔 Cat. Comercial:</strong></label>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setCrearNuevaCategoria(!crearNuevaCategoria);
                        setNuevaCategoriaTexto('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#007bff',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {crearNuevaCategoria ? '🔙 Seleccionar existente' : '➕ Crear Nueva'}
                    </button>
                  </div>

                  {crearNuevaCategoria ? (
                    <input
                      type="text"
                      placeholder="Ej: Picadas, Ensaladas..."
                      required
                      disabled={isSaving}
                      value={nuevaCategoriaTexto}
                      onChange={(e) => setNuevaCategoriaTexto(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #007bff', boxSizing: 'border-box', backgroundColor: '#e7f5ff' }}
                    />
                  ) : (
                    <select
                      disabled={isSaving}
                      value={form.IDcategoria_comercial}
                      onChange={(e) => setForm({ ...form, IDcategoria_comercial: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: '#fff' }}
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
              <div style={{ borderTop: '1px solid #eee', paddingTop: '1.2rem', marginTop: '1rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.8rem' }}>🥗 Ingredientes Incluidos</h4>
                {form.ingredientes.map((ing, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '0.6rem' }}>
                    <input placeholder="Ej: Queso Mozzarella" disabled={isSaving} value={ing.nombre} onChange={(e) => updateIngrediente(idx, 'nombre', e.target.value)} style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <input placeholder="Ej: 200g" disabled={isSaving} value={ing.cantidad} onChange={(e) => updateIngrediente(idx, 'cantidad', e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <button type="button" disabled={isSaving} onClick={() => removeIngrediente(idx)} style={{ backgroundColor: '#ffc9c9', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', padding: '0 0.8rem' }}>🗑️</button>
                  </div>
                ))}
                <button type="button" disabled={isSaving} onClick={addIngrediente} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #ccc', cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: '0.4rem' }}>+ Agregar Ingrediente</button>
              </div>

              {/* Grupos de Opciones */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '1.2rem', marginTop: '1.2rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.8rem' }}>🍦 Grupos de Opciones / Gustos</h4>
                {form.grupos_opciones.map((grupo, gIdx) => (
                  <div key={gIdx} style={{ border: '1px solid #cce5ff', backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input placeholder="Nombre Grupo (Ej: Gustos de Helado)" disabled={isSaving} value={grupo.nombre} onChange={(e) => updateGrupoOpcion(gIdx, 'nombre', e.target.value)} style={{ flex: '2 1 200px', padding: '0.5rem', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #ccc' }} />

                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="checkbox" disabled={isSaving} checked={grupo.obligatorio} onChange={(e) => updateGrupoOpcion(gIdx, 'obligatorio', e.target.checked)} /> Obligatorio
                      </label>

                      <label style={{ backgroundColor: '#fff3bf', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="checkbox"
                          disabled={isSaving}
                          checked={grupo.permitir_cantidad || false}
                          onChange={(e) => updateGrupoOpcion(gIdx, 'permitir_cantidad', e.target.checked)}
                        /> Acumular cantidad por opción
                      </label>

                      <button type="button" disabled={isSaving} onClick={() => removeGrupoOpcion(gIdx)} style={{ backgroundColor: '#ffc9c9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', marginLeft: 'auto' }}>Eliminar Grupo</button>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '0.8rem' }}>
                      <small>Min Selección: <input type="number" disabled={isSaving} value={grupo.min_seleccion} onChange={(e) => updateGrupoOpcion(gIdx, 'min_seleccion', Number(e.target.value))} style={{ width: '55px', padding: '0.2rem' }} /></small>
                      <small>Max Selección: <input type="number" disabled={isSaving} value={grupo.max_seleccion} onChange={(e) => updateGrupoOpcion(gIdx, 'max_seleccion', Number(e.target.value))} style={{ width: '55px', padding: '0.2rem' }} /></small>
                    </div>

                    <div style={{ paddingLeft: '0.8rem', borderLeft: '3px solid #1c7ed6', marginTop: '0.6rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0' }}>Opciones / Sabores pertenecientes:</h5>
                      {grupo.opciones.map((opc, oIdx) => {
                        const opcDisponible = parseDisponible(opc.disponible) === 1;

                        return (
                          <div key={oIdx} style={{ display: 'flex', gap: '10px', marginBottom: '0.4rem', alignItems: 'center' }}>
                            <input
                              placeholder="Ej: Dulce de Leche"
                              disabled={isSaving}
                              value={opc.nombre}
                              onChange={(e) => updateOpcionInGrupo(gIdx, oIdx, 'nombre', e.target.value)}
                              style={{ flex: 2, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              disabled={isSaving}
                              placeholder="Precio Adicional (+ $0)"
                              value={opc.precio_adicional}
                              onChange={(e) => updateOpcionInGrupo(gIdx, oIdx, 'precio_adicional', e.target.value)}
                              style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            />

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => {
                                const nuevoEstado = opcDisponible ? 0 : 1;
                                updateOpcionInGrupo(gIdx, oIdx, 'disponible', nuevoEstado);
                              }}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                backgroundColor: opcDisponible ? '#e6fcf5' : '#fff5f5',
                                color: opcDisponible ? '#0ca678' : '#e03131',
                                border: `1px solid ${opcDisponible ? '#0ca678' : '#e03131'}`,
                                borderRadius: '4px',
                                cursor: isSaving ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {opcDisponible ? '🟢 Disponible' : '🔴 Agotado'}
                            </button>

                            <button type="button" disabled={isSaving} onClick={() => removeOpcionFromGrupo(gIdx, oIdx)} style={{ border: 'none', background: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}>❌</button>
                          </div>
                        );
                      })}
                      <button type="button" disabled={isSaving} onClick={() => addOpcionToGrupo(gIdx)} style={{ marginTop: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.85rem', cursor: isSaving ? 'not-allowed' : 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}>+ Añadir Sabor/Opción</button>
                    </div>
                  </div>
                ))}
                <button type="button" disabled={isSaving} onClick={addGrupoOpcion} style={{ padding: '0.5rem 1rem', backgroundColor: '#1c7ed6', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>+ Crear Grupo de Opciones</button>
              </div>

              {/* Botones de Acción */}
              <div style={{ marginTop: '1.8rem', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={isSaving}
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '0.6rem 1.5rem',
                    backgroundColor: isSaving ? '#6c757d' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {isSaving ? '⏳ Guardando...' : '💾 Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Productos Existentes */}
      {loading ? <p>Cargando productos...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef', textAlign: 'left' }}>
              <th style={{ padding: '0.8rem' }}>Imagen</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Prep.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => {
              const estaEditandoEste = editingId === prod.id;
              const estaCambiandoEste = isTogglingId === prod.id;
              const estaDisponible = parseDisponible(prod.disponible) === 1;

              return (
                <tr key={prod.id} style={{ borderBottom: '1px solid #ddd', backgroundColor: estaEditandoEste ? '#e7f5ff' : 'transparent' }}>
                  <td style={{ padding: '0.8rem' }}>
                    <img
                      src={
                        prod.imagen_url && prod.imagen_url.trim() !== ''
                          ? (prod.imagen_url.startsWith('http')
                            ? prod.imagen_url
                            : `${API_BASE_URL}${prod.imagen_url}`)
                          : 'https://placehold.co/50x50?text=Sin+Foto'
                      }
                      alt={prod.nombre}
                      style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/50x50?text=Sin+Foto';
                      }}
                    />
                  </td>
                  <td><strong>{prod.nombre}</strong></td>
                  <td>${Number(prod.precio).toFixed(2)}</td>
                  <td>⏱️ {prod.tiempo_preparacion_min || 15}m</td>
                  <td>
                    <span style={{ color: estaDisponible ? 'green' : 'red', fontWeight: 'bold' }}>
                      {estaDisponible ? '🟢 Disponible' : '🔴 Pausado'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '5px', padding: '0.8rem 0' }}>
                    <button
                      onClick={() => handleEditarClick(prod)}
                      disabled={isSaving || Boolean(isTogglingId)}
                      style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() => handleToggleDisponible(prod.id)}
                      disabled={estaCambiandoEste || isSaving}
                      style={{
                        padding: '0.4rem 0.8rem',
                        cursor: (estaCambiandoEste || isSaving) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {estaCambiandoEste
                        ? '⏳ Procesando...'
                        : (estaDisponible ? '⏸️ Pausar' : '▶️ Activar')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};