// src/pages/Cliente/RegisterPage.jsx (o src/pages/RegisterPage.jsx)
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { obtenerPosicion } from '../utils/geo'; // 👈 Importamos la función robusta de geo.js
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import './Auth.css';

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

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

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

  const [mapCenter, setMapCenter] = useState([-32.4075, -63.2402]); // Villa María por defecto
  const [markerPosition, setMarkerPosition] = useState(null);

  const [error, setError] = useState('');
  const [loadingGps, setLoadingGps] = useState(true);
  const [modalAviso, setModalAviso] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🌍 Obtención inteligente de posición usando geo.js
  useEffect(() => {
    const cargarUbicacionGPS = async () => {
      try {
        setLoadingGps(true);
        setError('');

        // Llama a la función optimizada de geo.js que maneja fallbacks automáticamente
        const pos = await obtenerPosicion();
        const lat = pos.lat;
        const lng = pos.lng;

        setMapCenter([lat, lng]);
        setMarkerPosition([lat, lng]);
        setForm((prev) => ({
          ...prev,
          latitud: lat,
          longitud: lng
        }));

        // Intentar obtener la dirección legible mediante Nominatim
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
        }
      } catch (err) {
        console.warn('No se pudo obtener la ubicación automática:', err.message);
        setError('No pudimos obtener tu ubicación automáticamente. Selecciona tu domicilio haciendo clic en el mapa.');
      } finally {
        setLoadingGps(false);
      }
    };

    cargarUbicacionGPS();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.latitud || !form.longitud) {
      setError('Por favor, selecciona una ubicación válida en el mapa antes de registrarte.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerClient({
        ...form,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      });
      
      setModalAviso({
        titulo: '✓ ¡Registro Exitoso!',
        mensaje: 'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.'
      });
    } catch (err) {
      console.error('Detalle del error del backend:', err.response?.data);
      const serverError = 
        err.response?.data?.error || 
        err.response?.data?.message || 
        (typeof err.response?.data === 'string' ? err.response.data : null) || 
        err.message;

      setError(serverError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page" style={{ minHeight: 'auto', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '640px' }}>
        
        <div className="auth-card__header">
          <h2 className="auth-card__title">Registro de Cliente</h2>
          <p className="auth-card__subtitle">Completa tus datos y selecciona tu ubicación de entrega</p>
        </div>
        
        {error && (
          <div className="auth-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loadingGps && (
          <div className="admin-inline-note admin-inline-note--info" style={{ marginBottom: '12px' }}>
            <span className="admin-spinner"></span>
            <span>📍 Detectando ubicación actual...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="auth-field">
              <label>Nombre</label>
              <input type="text" name="nombre" className="auth-input" placeholder="Tu nombre" value={form.nombre} onChange={handleChange} disabled={isSubmitting} required />
            </div>
            <div className="auth-field">
              <label>Apellido</label>
              <input type="text" name="apellido" className="auth-input" placeholder="Tu apellido" value={form.apellido} onChange={handleChange} disabled={isSubmitting} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="auth-field">
              <label>Nombre de usuario</label>
              <input type="text" name="username" className="auth-input" placeholder="usuario123" value={form.username} onChange={handleChange} disabled={isSubmitting} required />
            </div>
            <div className="auth-field">
              <label>Teléfono</label>
              <input type="text" name="telefono" className="auth-input" placeholder="3534123456" value={form.telefono} onChange={handleChange} disabled={isSubmitting} required />
            </div>
          </div>

          <div className="auth-field">
            <label>Correo electrónico</label>
            <input type="email" name="email" className="auth-input" placeholder="nombre@correo.com" value={form.email} onChange={handleChange} disabled={isSubmitting} required />
          </div>

          <div className="auth-field">
            <label>Contraseña</label>
            <input type="password" name="password" className="auth-input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={handleChange} disabled={isSubmitting} required />
          </div>

          {/* 🗺️ Bloque de Geolocalización Integrado */}
          <div className="admin-subbox" style={{ marginTop: '4px' }}>
            <h4 className="admin-subbox__title">📍 Ubicación de entrega</h4>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sd-text-secondary)' }}>
              Mueve el marcador o haz clic en el mapa para ajustar tu posición exacta.
            </p>

            <div style={{ height: '280px', width: '100%', borderRadius: 'var(--sd-radius-ctl)', overflow: 'hidden', border: '1px solid var(--sd-border)' }}>
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={mapCenter} />
                <LocationSelector position={markerPosition} setPosition={setMarkerPosition} setForm={setForm} />
              </MapContainer>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: 'var(--sd-text-secondary)' }}>
              <span><strong>Latitud:</strong> {form.latitud || 'Pendiente'}</span>
              <span><strong>Longitud:</strong> {form.longitud || 'Pendiente'}</span>
            </div>
          </div>

          <div className="auth-field">
            <label>Dirección de entrega</label>
            <input type="text" name="direccion" className="auth-input" placeholder="Calle y número" value={form.direccion} onChange={handleChange} disabled={isSubmitting} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="auth-field">
              <label>Piso (opcional)</label>
              <input type="text" name="piso" className="auth-input" placeholder="Ej: 2" value={form.piso} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div className="auth-field">
              <label>Departamento (opcional)</label>
              <input type="text" name="departamento" className="auth-input" placeholder="Ej: B" value={form.departamento} onChange={handleChange} disabled={isSubmitting} />
            </div>
          </div>

          <div className="auth-field">
            <label>Referencia (opcional)</label>
            <input type="text" name="referencia" className="auth-input" placeholder="Entre calles, color de fachada, etc." value={form.referencia} onChange={handleChange} disabled={isSubmitting} />
          </div>

          <button 
            type="submit" 
            className="admin-btn admin-btn--primary admin-btn--block" 
            disabled={isSubmitting}
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? (
              <>
                <span className="admin-spinner"></span>
                Registrando cuenta...
              </>
            ) : (
              'Registrarse'
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <Link to="/login">¿Ya tienes cuenta? Inicia Sesión</Link>
        </div>

      </div>

      {/* 🟢 Modal Estético de Éxito */}
      {modalAviso && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--sd-success)', marginTop: 0 }}>{modalAviso.titulo}</h3>
            <p style={{ color: 'var(--sd-text-main)', fontSize: '0.9375rem', margin: '1rem 0', lineHeight: '1.5' }}>
              {modalAviso.mensaje}
            </p>
            <button
              onClick={() => {
                setModalAviso(null);
                navigate('/login');
              }}
              className="admin-btn admin-btn--primary admin-btn--block"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};