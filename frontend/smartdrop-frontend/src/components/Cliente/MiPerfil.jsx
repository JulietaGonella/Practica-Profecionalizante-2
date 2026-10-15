// src/components/Cliente/MiPerfil.jsx
import { useState, useEffect } from 'react';
import { getMiPerfil, updateMiPerfil } from '../../api/clientesService';
import { MisDireccionesManager } from './MisDirecciones';
import { CambiarPasswordModal } from '../CambiarPasswordModal';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados

export const MiPerfil = () => {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    telefono: '',
    direccion: '',
    piso: '',
    departamento: '',
    referencia: '',
    latitud: '',
    longitud: ''
  });

  const [perfilOriginal, setPerfilOriginal] = useState(null);
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [seccion, setSeccion] = useState('perfil'); // 'perfil' | 'direcciones'
  const [mostrarCambioPass, setMostrarCambioPass] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });
    try {
      const data = await getMiPerfil();
      const perfilCargado = {
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        username: data.username || '',
        email: data.email || '',
        telefono: data.telefono || '',
        direccion: data.direccion || '',
        piso: data.piso || '',
        departamento: data.departamento || '',
        referencia: data.referencia || '',
        latitud: data.latitud ?? '',
        longitud: data.longitud ?? ''
      };
      setForm(perfilCargado);
      setPerfilOriginal(perfilCargado);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'No se pudieron obtener los datos de tu perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setMensaje({ tipo: 'error', texto: '⚠️ La geolocalización no es soportada por tu navegador.' });
      return;
    }

    setLoadingGps(true);
    setMensaje({ tipo: '', texto: '' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }));
        setLoadingGps(false);
        setMensaje({ tipo: 'exito', texto: '✓ Ubicación GPS obtenida correctamente.' });
      },
      (err) => {
        setMensaje({ tipo: 'error', texto: '⚠️ No se pudo obtener la ubicación GPS. Verifica los permisos de tu navegador.' });
        setLoadingGps(false);
      }
    );
  };

  const handleCancelarEdicion = () => {
    if (perfilOriginal) {
      setForm(perfilOriginal);
    }
    setEditando(false);
    setMensaje({ tipo: '', texto: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const payload = {
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        direccion: form.direccion,
        piso: form.piso,
        departamento: form.departamento,
        referencia: form.referencia,
        latitud: form.latitud ? Number(form.latitud) : null,
        longitud: form.longitud ? Number(form.longitud) : null
      };

      const res = await updateMiPerfil(payload);
      setMensaje({ tipo: 'exito', texto: res.message || 'Perfil actualizado exitosamente.' });
      setPerfilOriginal(form);
      setEditando(false);
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.error || 'Error al actualizar el perfil.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sd-container">
        <div className="sd-state">
          <span className="sd-spinner"></span>
          <p>Cargando información de tu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-container">
      <div className="sd-profile-container">

        {/* Navegación entre Pestañas */}
        <div className="sd-profile-tabs">
          <button
            type="button"
            onClick={() => setSeccion('perfil')}
            className={`sd-profile-tab ${seccion === 'perfil' ? 'active' : ''}`}
          >
            👤 Datos de Perfil
          </button>

          <button
            type="button"
            onClick={() => setSeccion('direcciones')}
            className={`sd-profile-tab ${seccion === 'direcciones' ? 'active' : ''}`}
          >
            📍 Mis Ubicaciones Guardadas
          </button>
        </div>

        {seccion === 'direcciones' ? (
          <MisDireccionesManager permitirAgregar={false} />
        ) : (
          <>
            <div className="sd-profile-head">
              <h2>👤 Mi Cuenta / Perfil</h2>

              <div className="sd-profile-actions">
                <button
                  type="button"
                  onClick={() => setMostrarCambioPass(!mostrarCambioPass)}
                  className="admin-btn admin-btn--outline admin-btn--sm"
                >
                  🔐 {mostrarCambioPass ? 'Ocultar Cambio Clave' : 'Cambiar Contraseña'}
                </button>

                {!editando && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(true);
                      setMensaje({ tipo: '', texto: '' });
                    }}
                    className="admin-btn admin-btn--primary admin-btn--sm"
                  >
                    ✏️ Editar Perfil
                  </button>
                )}
              </div>
            </div>

            {mostrarCambioPass && (
              <div style={{ marginBottom: '16px' }}>
                <CambiarPasswordModal onClose={() => setMostrarCambioPass(false)} />
              </div>
            )}

            {mensaje.texto && (
              <div
                className={`admin-banner ${
                  mensaje.tipo === 'error' ? 'admin-banner--error' : 'admin-banner--success'
                }`}
                role="alert"
              >
                <span>{mensaje.tipo === 'error' ? '⚠️' : '✓'}</span>
                <span>{mensaje.texto}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-grid-2">
                <div className="admin-field">
                  <label className="admin-field__label">Nombre:</label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    disabled={!editando}
                    required
                    className="admin-input"
                  />
                </div>

                <div className="admin-field">
                  <label className="admin-field__label">Apellido:</label>
                  <input
                    type="text"
                    name="apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    disabled={!editando}
                    required
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-grid-2">
                <div className="admin-field">
                  <label className="admin-field__label">Usuario:</label>
                  <input type="text" value={form.username} disabled className="admin-input admin-input--readonly" />
                </div>

                <div className="admin-field">
                  <label className="admin-field__label">Email:</label>
                  <input type="email" value={form.email} disabled className="admin-input admin-input--readonly" />
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-field__label">Teléfono *:</label>
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  disabled={!editando}
                  required
                  className="admin-input"
                />
              </div>

              {(editando || form.direccion) && (
                <div className="admin-field">
                  <label className="admin-field__label">Dirección Principal *:</label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    disabled={!editando}
                    required={editando}
                    placeholder="Calle y altura"
                    className="admin-input"
                  />
                </div>
              )}

              {(editando || form.piso || form.departamento) && (
                <div className="admin-form-grid">
                  {(editando || form.piso) && (
                    <div className="admin-field">
                      <label className="admin-field__label">Piso:</label>
                      <input
                        type="text"
                        name="piso"
                        value={form.piso}
                        onChange={handleChange}
                        disabled={!editando}
                        placeholder="Ej: 4"
                        className="admin-input"
                      />
                    </div>
                  )}
                  {(editando || form.departamento) && (
                    <div className="admin-field">
                      <label className="admin-field__label">Depto:</label>
                      <input
                        type="text"
                        name="departamento"
                        value={form.departamento}
                        onChange={handleChange}
                        disabled={!editando}
                        placeholder="Ej: B"
                        className="admin-input"
                      />
                    </div>
                  )}
                </div>
              )}

              {(editando || form.referencia) && (
                <div className="admin-field">
                  <label className="admin-field__label">Referencia de entrega:</label>
                  <input
                    type="text"
                    name="referencia"
                    value={form.referencia}
                    onChange={handleChange}
                    disabled={!editando}
                    placeholder="Ej: Portón blanco, entre calle X e Y"
                    className="admin-input"
                  />
                </div>
              )}

              {(editando || form.latitud) && (
                <div className="sd-gps-box">
                  <div className="sd-gps-info">
                    <strong>📍 Geolocalización GPS</strong>
                    <small style={{ color: form.latitud ? 'var(--sd-success)' : 'var(--sd-text-secondary)' }}>
                      {form.latitud ? '✓ Ubicación sincronizada correctamente' : '⚠️ Sin coordenadas GPS registradas'}
                    </small>
                  </div>

                  {editando && (
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={loadingGps}
                      className="admin-btn admin-btn--outline admin-btn--sm"
                    >
                      {loadingGps ? 'Obteniendo...' : '🎯 Actualizar GPS'}
                    </button>
                  )}
                </div>
              )}

              {!form.direccion && !editando && (
                <div className="admin-inline-note admin-inline-note--error">
                  ⚠️ No tienes una dirección principal configurada. Haz clic en <strong>"✏️ Editar Perfil"</strong> para agregar una o búscala en la pestaña <em>Mis Ubicaciones Guardadas</em>.
                </div>
              )}

              {editando && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCancelarEdicion}
                    disabled={isSubmitting}
                    className="admin-btn admin-btn--outline admin-btn--block"
                  >
                    ❌ Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="admin-btn admin-btn--success admin-btn--block"
                  >
                    {isSubmitting ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                </div>
              )}
            </form>
          </>
        )}

      </div>
    </div>
  );
};