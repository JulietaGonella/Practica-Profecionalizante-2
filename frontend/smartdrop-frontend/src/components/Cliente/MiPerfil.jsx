// src/components/Cliente/MiPerfil.jsx
import { useState, useEffect } from 'react';
import { getMiPerfil, updateMiPerfil } from '../../api/clientesService';
import { MisDireccionesManager } from './MisDirecciones';

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

  // 🟢 Estado para guardar una copia de respaldo del perfil y restaurar si cancela
  const [perfilOriginal, setPerfilOriginal] = useState(null);

  // 🟢 Estado para controlar la edición/deshabilitación del formulario
  const [editando, setEditando] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [seccion, setSeccion] = useState('perfil'); // 'perfil' | 'direcciones'

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
      setPerfilOriginal(perfilCargado); // Guardamos la copia original
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'No se pudieron obtener los datos de tu perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Capturar coordenadas por GPS del navegador
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

  // 🟢 Cancelar la edición y restaurar datos
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
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      };

      const res = await updateMiPerfil(payload);
      setMensaje({ tipo: 'exito', texto: res.message || 'Perfil actualizado exitosamente.' });
      
      // 🟢 Actualizamos la copia original con los nuevos datos y volvemos a bloquear los inputs
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
      
      {/* 🟢 Navegación entre Pestañas */}
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
            
            {/* 🟢 Botón para alternar la edición */}
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Dirección Principal *:</label>
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                disabled={!editando}
                required
                style={{ width: '100%', padding: '0.5rem', backgroundColor: !editando ? '#f8f9fa' : '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
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
            </div>

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

            <div style={{ border: '1px dashed #aaa', padding: '1rem', marginBottom: '1.5rem', borderRadius: '6px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Coordenadas asignadas (GPS):</label>
              <p style={{ margin: '0.3rem 0' }}><small>Latitud: {form.latitud || 'No asignada'}</small></p>
              <p style={{ margin: '0.3rem 0' }}><small>Longitud: {form.longitud || 'No asignada'}</small></p>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={!editando || loadingGps}
                style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', cursor: !editando || loadingGps ? 'not-allowed' : 'pointer' }}
              >
                {loadingGps ? 'Obteniendo GPS...' : '🎯 Actualizar con GPS actual'}
              </button>
            </div>

            {/* 🟢 Acciones solo visibles en modo edición */}
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