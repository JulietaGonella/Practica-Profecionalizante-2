import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Solución para el ícono por defecto de Leaflet en React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente auxiliar para recentrar el mapa dinámicamente cuando cambia el centro
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Componente auxiliar para capturar clics manuales en el mapa
const LocationSelector = ({ position, setPosition, setForm }) => {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPosition([lat, lng]);
      setForm((prev) => ({
        ...prev,
        latitud: lat,
        longitud: lng
      }));
    },
  });

  return position === null ? null : <Marker position={position}></Marker>;
};

export const RegisterPage = () => {
  const { registerClient } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    password: '',
    direccion: '',
    piso: '',
    departamento: '',
    referencia: '',
    telefono: '',
    latitud: '',
    longitud: ''
  });

  // Centro por defecto (Villa María, Córdoba) temporal hasta que cargue el GPS
  const [mapCenter, setMapCenter] = useState([-32.4075, -63.2402]);
  const [markerPosition, setMarkerPosition] = useState(null);

  const [error, setError] = useState('');
  const [loadingGps, setLoadingGps] = useState(true);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🌍 Obtener Ubicación GPS automáticamente al cargar la página
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('La geolocalización no es soportada por tu navegador. Por favor, selecciona tu ubicación en el mapa.');
      setLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setMapCenter([lat, lng]);
        setMarkerPosition([lat, lng]);
        setForm((prev) => ({
          ...prev,
          latitud: lat,
          longitud: lng
        }));

        // Intentar obtener la dirección legible mediante Nominatim (Reverse Geocoding)
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          if (data && data.display_name) {
            setForm((prev) => ({
              ...prev,
              direccion: data.display_name
            }));
          }
        } catch (err) {
          console.error('No se pudo obtener la dirección automática:', err);
        } finally {
          setLoadingGps(false);
        }
      },
      (err) => {
        console.warn('Permiso de GPS denegado o no disponible:', err.message);
        setError('No pudimos obtener tu ubicación automáticamente. Selecciona tu domicilio haciendo clic en el mapa.');
        setLoadingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.latitud || !form.longitud) {
      setError('Por favor, selecciona una ubicación válida en el mapa.');
      return;
    }

    try {
      await registerClient({
        ...form,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      });
      alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      // 🔍 Esto imprimirá el error real del servidor en la consola del navegador
      console.error('Detalle del error del backend:', err.response?.data);

      // Extraemos el mensaje sin importar cómo lo envíe el backend
      const serverError = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        (typeof err.response?.data === 'string' ? err.response.data : null) || 
        err.message;

      setError(serverError);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Registro de Cliente con Geolocalización</h2>
      {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
      {loadingGps && <p style={{ color: '#666', fontStyle: 'italic' }}>📍 Detectando tu ubicación actual...</p>}

      <form onSubmit={handleSubmit}>
        <input type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
        <input type="text" name="apellido" placeholder="Apellido" value={form.apellido} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
        <input type="text" name="username" placeholder="Nombre de usuario" value={form.username} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
        <input type="email" name="email" placeholder="Correo electrónico" value={form.email} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
        <input type="password" name="password" placeholder="Contraseña (mínimo 8 caracteres)" value={form.password} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
        <input type="text" name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />
        
        <div style={{ border: '1px dashed #aaa', padding: '12px', marginBottom: '15px', borderRadius: '6px', backgroundColor: '#f9f9f9' }}>
          <p style={{ margin: '0 0 8px' }}>
            <small><strong>Ubicación de entrega:</strong> Mueve el marcador o haz clic en otra parte del mapa si deseas ajustarla.</small>
          </p>

          {/* 🗺️ Contenedor del Mapa Visual */}
          <div style={{ height: '300px', width: '100%', marginBottom: '10px', borderRadius: '4px', overflow: 'hidden' }}>
            <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={mapCenter} />
              <LocationSelector position={markerPosition} setPosition={setMarkerPosition} setForm={setForm} />
            </MapContainer>
          </div>

          <p style={{ margin: '4px 0' }}><small><strong>Latitud:</strong> {form.latitud || 'Pendiente'}</small></p>
          <p style={{ margin: '0 0 4px' }}><small><strong>Longitud:</strong> {form.longitud || 'Pendiente'}</small></p>
        </div>

        <input type="text" name="direccion" placeholder="Dirección de entrega" value={form.direccion} onChange={handleChange} required style={{ width: '100%', marginBottom: '10px', padding: '8px' }} />

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input type="text" name="piso" placeholder="Piso (opcional)" value={form.piso} onChange={handleChange} style={{ flex: 1, padding: '8px' }} />
          <input type="text" name="departamento" placeholder="Departamento (opcional)" value={form.departamento} onChange={handleChange} style={{ flex: 1, padding: '8px' }} />
        </div>

        <input type="text" name="referencia" placeholder="Referencia (opcional, ej: Entre calles, color de casa)" value={form.referencia} onChange={handleChange} style={{ width: '100%', marginBottom: '15px', padding: '8px' }} />

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Registrarse</button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center' }}><small>¿Ya tienes cuenta? <Link to="/login">Inicia Sesión</Link></small></p>
    </div>
  );
};