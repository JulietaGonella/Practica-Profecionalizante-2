// src/components/Cliente/MisDireccionesManager.jsx
import { useState, useEffect } from 'react';
import { getMisDirecciones, createMiDireccion, deleteMiDireccion } from '../../api/clientesService';

export const MisDireccionesManager = () => {
  const [direcciones, setDirecciones] = useState([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorGps, setErrorGps] = useState('');
  const [form, setForm] = useState({
    alias: '',
    direccion: '',
    piso: '',
    departamento: '',
    referencia: '',
    latitud: '',
    longitud: '',
    es_principal: false
  });

  const cargarDirecciones = async () => {
    try {
      const data = await getMisDirecciones();
      setDirecciones(data);
    } catch (err) {
      console.error('Error al cargar direcciones:', err);
    }
  };

  useEffect(() => { cargarDirecciones(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleObtenerGpsActual = () => {
    if (!navigator.geolocation) return alert('GPS no soportado en este navegador.');
    setLoadingGps(true);
    setErrorGps('');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        }));
        setLoadingGps(false);
      },
      (err) => {
        console.error('Error al obtener la ubicación GPS:', err);
        setErrorGps('No se pudieron obtener las coordenadas GPS. Verifica los permisos de tu navegador.');
        setLoadingGps(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación visual antes de enviar: requiere captura de GPS
    if (!form.latitud || !form.longitud) {
      setErrorGps('Es obligatorio adjuntar la posición GPS actual para poder cotizar y procesar los envíos con precisión.');
      return;
    }

    setSubmitting(true);
    try {
      await createMiDireccion({
        ...form,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      });
      await cargarDirecciones();
      setForm({ alias: '', direccion: '', piso: '', departamento: '', referencia: '', latitud: '', longitud: '', es_principal: false });
      setErrorGps('');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar la dirección');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta dirección?')) return;
    try {
      await deleteMiDireccion(id);
      cargarDirecciones();
    } catch (err) {
      alert('Error al eliminar la dirección.');
    }
  };

  const tieneGps = Boolean(form.latitud && form.longitud);

  return (
    <div>
      <h3>📍 Mis Ubicaciones Guardadas</h3>
      
      {direcciones.length === 0 ? (
        <p style={{ color: '#666' }}>No tienes direcciones guardadas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {direcciones.map(dir => (
            <li key={dir.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>[{dir.alias}]</strong> {dir.direccion} {dir.piso ? `(Piso ${dir.piso} ${dir.departamento || ''})` : ''}
                {dir.es_principal === 1 && <span style={{ color: '#1c7ed6', marginLeft: '8px', fontWeight: 'bold' }}>★ Principal</span>}
              </div>
              <button onClick={() => handleEliminar(dir.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4>➕ Agregar Nueva Ubicación</h4>
        
        <input name="alias" placeholder="Alias (ej: Casa, Trabajo)" value={form.alias} onChange={handleChange} required style={{ padding: '0.5rem' }} />
        <input name="direccion" placeholder="Calle y Altura" value={form.direccion} onChange={handleChange} required style={{ padding: '0.5rem' }} />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input name="piso" placeholder="Piso" value={form.piso} onChange={handleChange} style={{ flex: 1, padding: '0.5rem' }} />
          <input name="departamento" placeholder="Depto" value={form.departamento} onChange={handleChange} style={{ flex: 1, padding: '0.5rem' }} />
        </div>

        <input name="referencia" placeholder="Referencia de entrega" value={form.referencia} onChange={handleChange} style={{ padding: '0.5rem' }} />

        {/* Bloque con validación visual para las coordenadas GPS */}
        <div 
          style={{ 
            padding: '0.8rem', 
            border: `1px solid ${tieneGps ? '#2b8a3e' : '#f59f00'}`, 
            borderRadius: '6px',
            backgroundColor: tieneGps ? '#ebfbee' : '#fff9db'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: tieneGps ? '#2b8a3e' : '#f59f00' }}>
              {tieneGps 
                ? `✓ GPS Detectado: ${Number(form.latitud).toFixed(4)}, ${Number(form.longitud).toFixed(4)}` 
                : '⚠️ Punto GPS no capturado'}
            </span>
            <button 
              type="button" 
              onClick={handleObtenerGpsActual} 
              disabled={loadingGps} 
              style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loadingGps ? '⏳ Obteniendo GPS...' : '🎯 Capturar posición GPS actual'}
            </button>
          </div>

          {!tieneGps && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.82rem', color: '#e67700' }}>
              Es indispensable adjuntar la ubicación GPS para cotizar el costo de envío con precisión al realizar un pedido.
            </p>
          )}
        </div>

        {errorGps && (
          <div style={{ padding: '0.6rem', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: '4px', color: '#e03131', fontSize: '0.85rem' }}>
            ⚠️ {errorGps}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" name="es_principal" checked={form.es_principal} onChange={handleChange} />
          Establecer como dirección principal
        </label>

        <button type="submit" disabled={submitting} style={{ padding: '0.7rem', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          {submitting ? 'Guardando...' : '💾 Guardar Dirección'}
        </button>
      </form>
    </div>
  );
};