// src/components/Cliente/MiPerfil.jsx
import { useState, useEffect } from 'react';
import { getMiPerfil, updateMiPerfil } from '../../api/clientesService';
import { MisDireccionesManager } from './MisDirecciones';
import { CambiarPasswordModal } from '../CambiarPasswordModal';

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
      alert('La geolocalización no es soportada por tu navegador.');
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }));
        setLoadingGps(false);
      },
      (err) => {
        alert('No se pudo obtener la ubicación GPS.');
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

  if (loading) return <div>⏳ Cargando información de tu perfil...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '1rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>

      {/* Navegación entre Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '0.8rem' }}>
        <button
          type="button"
          onClick={() => setSeccion('perfil')}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: seccion === 'perfil' ? '#007bff' : '#f8f9fa',
            color: seccion === 'perfil' ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          👤 Datos de Perfil
        </button>

        <button
          type="button"
          onClick={() => setSeccion('direcciones')}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: seccion === 'direcciones' ? '#007bff' : '#f8f9fa',
            color: seccion === 'direcciones' ? '#fff' : '#333',
            border: '1px solid #ccc',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📍 Mis Ubicaciones Guardadas
        </button>
      </div>

      {seccion === 'direcciones' ? (
        <MisDireccionesManager />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>👤 Mi Cuenta / Perfil</h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMostrarCambioPass(!mostrarCambioPass)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✏️ Editar Perfil
                </button>
              )}
            </div>
          </div>

          {mostrarCambioPass && (
            <div style={{ marginBottom: '1.5rem' }}>
              <CambiarPasswordModal onClose={() => setMostrarCambioPass(false)} />
            </div>
          )}

          {mensaje.texto && (
            <p style={{ color: mensaje.tipo === 'error' ? 'red' : 'green', fontWeight: 'bold' }}>
              {mensaje.texto}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Nombre:</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                disabled={!editando}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Apellido:</label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                disabled={!editando}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Usuario:</label>
              <input type="text" value={form.username} disabled style={{ width: '100%', padding: '0.5rem', backgroundColor: '#e9ecef' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Email:</label>
              <input type="email" value={form.email} disabled style={{ width: '100%', padding: '0.5rem', backgroundColor: '#e9ecef' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Teléfono *:</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                disabled={!editando}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
              />
            </div>

            {/* DIRECCIÓN PRINCIPAL (Se oculta si no tiene valor y no se edita) */}
            {(editando || form.direccion) && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Dirección Principal *:</label>
                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  disabled={!editando}
                  required={editando}
                  placeholder="Calle y altura"
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
                />
              </div>
            )}

            {/* PISO Y DEPTO */}
            {(editando || form.piso || form.departamento) && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                {(editando || form.piso) && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Piso:</label>
                    <input
                      type="text"
                      name="piso"
                      value={form.piso}
                      onChange={handleChange}
                      disabled={!editando}
                      placeholder="Ej: 4"
                      style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
                    />
                  </div>
                )}
                {(editando || form.departamento) && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Depto:</label>
                    <input
                      type="text"
                      name="departamento"
                      value={form.departamento}
                      onChange={handleChange}
                      disabled={!editando}
                      placeholder="Ej: B"
                      style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* REFERENCIA */}
            {(editando || form.referencia) && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Referencia de entrega:</label>
                <input
                  type="text"
                  name="referencia"
                  value={form.referencia}
                  onChange={handleChange}
                  disabled={!editando}
                  placeholder="Ej: Portón blanco, entre calle X e Y"
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
                />
              </div>
            )}

            {/* INDICADOR DE GPS LIMPIO (Sin coordenadas crudas en números largos) */}
            {(editando || form.latitud) && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '0.8rem 1rem', marginBottom: '1.5rem', borderRadius: '6px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem' }}>📍 Geolocalización GPS</span>
                  <small style={{ color: form.latitud ? '#2b8a3e' : '#6c757d' }}>
                    {form.latitud ? '✓ Ubicación sincronizada correctamente' : '⚠️ Sin coordenadas GPS registradas'}
                  </small>
                </div>

                {editando && (
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={loadingGps}
                    style={{ padding: '0.4rem 0.8rem', cursor: loadingGps ? 'not-allowed' : 'pointer', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}
                  >
                    {loadingGps ? 'Obteniendo...' : '🎯 Actualizar GPS'}
                  </button>
                )}
              </div>
            )}

            {!form.direccion && !editando && (
              <div style={{ marginBottom: '1rem', padding: '0.8rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
                ⚠️ No tienes una dirección principal configurada. Haz clic en <strong>"✏️ Editar Perfil"</strong> para agregar una o búscala en la pestaña <em>Mis Ubicaciones Guardadas</em>.
              </div>
            )}

            {/* ACCIONES DE EDICIÓN */}
            {editando && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCancelarEdicion}
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '0.8rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ❌ Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '0.8rem', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
};