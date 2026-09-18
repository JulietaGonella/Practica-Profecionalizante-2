// src/components/Cliente/MisDirecciones.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getMisDirecciones, createMiDireccion, deleteMiDireccion } from '../../api/clientesService';

// Solución por defecto para el icono de Leaflet en React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🗺️ Componente auxiliar para recentrar el mapa automáticamente cuando cambia la posición
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 16, { animate: true });
    }
  }, [center, map]);
  return null;
};

// Componente auxiliar para capturar clics en el mapa y mover el marcador
const LocationSelector = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    },
  });

  return position === null ? null : (
    <Marker position={[position.lat, position.lng]} draggable={true} eventHandlers={{
      dragend(e) {
        const marker = e.target;
        const coord = marker.getLatLng();
        setPosition({ lat: coord.lat, lng: coord.lng });
      },
    }} />
  );
};

export const MisDireccionesManager = ({ onSuccessRedirect }) => {
  const navigate = useNavigate();
  const [direcciones, setDirecciones] = useState([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorGps, setErrorGps] = useState('');
  
  // Coordenadas por defecto (ej: centro de referencia o ciudad)
  const defaultCenter = { lat: -32.4133, lng: -63.2431 }; // Ajusta según tu ciudad base

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

  // Estado para la posición visual en el mapa
  const [mapPosition, setMapPosition] = useState(null);

  // Dentro de MisDireccionesManager (src/components/Cliente/MisDirecciones.jsx)
  const cargarDirecciones = async () => {
    try {
      const data = await getMisDirecciones();
      setDirecciones(data);

      // Si nos pasaron una redirección de éxito y el usuario ya tiene direcciones,
      // podemos validar de manera preventiva si su GPS actual ya coincide con alguna.
      if (onSuccessRedirect && data.length > 0 && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const TOLERANCIA_KM = 0.15;
          const estaCerca = data.some(dir => {
            if (!dir.latitud || !dir.longitud) return false;
            const dist = calcularDistanciaKm(pos.coords.latitude, pos.coords.longitude, Number(dir.latitud), Number(dir.longitud));
            return dist <= TOLERANCIA_KM;
          });

          // Si ya está dentro del rango de una dirección guardada y entró a esta pantalla por error, lo mandamos al inicio
          if (estaCerca) {
            navigate(onSuccessRedirect, { replace: true });
          }
        }, () => {}, { timeout: 10000 });
      }
    } catch (err) {
      console.error('Error al cargar direcciones:', err);
    }
  };

  useEffect(() => { cargarDirecciones(); }, []);

  // Sincronizar el mapa con el formulario cada vez que el usuario hace clic o arrastra el pin
  useEffect(() => {
    if (mapPosition) {
      setForm(prev => ({
        ...prev,
        latitud: mapPosition.lat,
        longitud: mapPosition.lng
      }));
    }
  }, [mapPosition]);

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
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setMapPosition(newCoords);
        setForm(prev => ({
          ...prev,
          latitud: newCoords.lat,
          longitud: newCoords.lng
        }));
        setLoadingGps(false);
      },
      (err) => {
        console.error('Error al obtener la ubicación GPS:', err);
        setErrorGps('El GPS tardó demasiado en responder o está desactivado. Por favor, haz clic directamente en el mapa para ubicar tu dirección de forma manual.');
        setLoadingGps(false);
      },
      {
        timeout: 25000,      // ⏱️ Aumentado de 10s a 25s para darle más tiempo al celular
        maximumAge: 60000,   // Permite usar una ubicación en caché reciente para agilizar la respuesta
        enableHighAccuracy: false // Cambiado a false temporalmente para evitar bloqueos estrictos de hardware
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.latitud || !form.longitud) {
      setErrorGps('Es obligatorio señalar tu ubicación exacta en el mapa o usar el GPS para procesar los envíos.');
      return;
    }

    setSubmitting(true);
    try {
      await createMiDireccion({
        ...form,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      });
      
      // 🛠️ CONDICIONAL DE REDIRECCIÓN SEGÚN EL ORIGEN
      if (onSuccessRedirect) {
        navigate(onSuccessRedirect, { replace: true });
        return;
      }

      await cargarDirecciones();
      setForm({ alias: '', direccion: '', piso: '', departamento: '', referencia: '', latitud: '', longitud: '', es_principal: false });
      setMapPosition(null);
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
        <input name="direccion" placeholder="Calle y Altura (ej: Av. San Martín 450)" value={form.direccion} onChange={handleChange} required style={{ padding: '0.5rem' }} />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input name="piso" placeholder="Piso (opcional)" value={form.piso} onChange={handleChange} style={{ flex: 1, padding: '0.5rem' }} />
          <input name="departamento" placeholder="Depto (opcional)" value={form.departamento} onChange={handleChange} style={{ flex: 1, padding: '0.5rem' }} />
        </div>

        <input name="referencia" placeholder="Referencia de entrega (opcional)" value={form.referencia} onChange={handleChange} style={{ padding: '0.5rem' }} />

        {/* SECCIÓN DEL MAPA INTERACTIVO */}
        <div style={{ margin: '0.5rem 0' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}>
            Selecciona tu ubicación exacta en el mapa: <span style={{ color: 'red' }}>*</span>
          </label>
          <small style={{ color: '#666', display: 'block', marginBottom: '0.5rem' }}>
            Haz clic en el mapa o usa el botón de GPS para centrar automáticamente el marcador.
          </small>

          <div style={{ height: '250px', width: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc' }}>
            <MapContainer 
              center={mapPosition || defaultCenter} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapPosition} />
              <LocationSelector position={mapPosition} setPosition={setMapPosition} />
            </MapContainer>
          </div>
        </div>

        {/* Botón de apoyo GPS rápido */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', backgroundColor: tieneGps ? '#ebfbee' : '#fff9db', border: `1px solid ${tieneGps ? '#2b8a3e' : '#f59f00'}`, borderRadius: '6px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: tieneGps ? '#2b8a3e' : '#f59f00' }}>
            {tieneGps ? '✓ Ubicación seleccionada en el mapa' : '⚠️ Aún no has marcado tu ubicación'}
          </span>
          <button 
            type="button" 
            onClick={handleObtenerGpsActual} 
            disabled={loadingGps} 
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            {loadingGps ? '⏳ Buscando...' : '🎯 Usar mi GPS actual'}
          </button>
        </div>

        {errorGps && (
          <div style={{ padding: '0.6rem', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: '4px', color: '#e03131', fontSize: '0.85rem' }}>
            ⚠️ {errorGps}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
          <input type="checkbox" name="es_principal" checked={form.es_principal} onChange={handleChange} />
          Establecer como dirección principal
        </label>

        <button type="submit" disabled={submitting} style={{ padding: '0.7rem', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>
          {submitting ? 'Guardando...' : '💾 Guardar Dirección'}
        </button>
      </form>
    </div>
  );
};