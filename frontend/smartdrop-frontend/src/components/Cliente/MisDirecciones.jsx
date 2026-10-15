// src/components/Cliente/MisDirecciones.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getMisDirecciones, createMiDireccion, deleteMiDireccion } from '../../api/clientesService';
import { calcularDistanciaKm } from '../../utils/geo';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 16, { animate: true });
    }
  }, [center, map]);
  return null;
};

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

export const MisDireccionesManager = ({ onSuccessRedirect, permitirAgregar = true }) => {
  const navigate = useNavigate();
  const [direcciones, setDirecciones] = useState([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorGps, setErrorGps] = useState('');
  const [mensajeBanner, setMensajeBanner] = useState('');

  const [idAEliminar, setIdAEliminar] = useState(null);

  const defaultCenter = { lat: -32.4133, lng: -63.2431 };

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

  const [mapPosition, setMapPosition] = useState(null);

  const cargarDirecciones = async () => {
    try {
      const data = await getMisDirecciones();
      setDirecciones(data);

      if (onSuccessRedirect && data.length > 0 && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const TOLERANCIA_KM = 0.6;
          const estaCercaDeAlguna = data.some(dir => {
            if (!dir.latitud || !dir.longitud) return false;
            const dist = calcularDistanciaKm(
              pos.coords.latitude, 
              pos.coords.longitude, 
              Number(dir.latitud), 
              Number(dir.longitud)
            );
            return dist <= TOLERANCIA_KM;
          });

          if (estaCercaDeAlguna) {
            navigate(onSuccessRedirect, { replace: true });
          }
        }, () => { }, { timeout: 10000 });
      }
    } catch (err) {
      console.error('Error al cargar direcciones:', err);
    }
  };

  useEffect(() => { cargarDirecciones(); }, []);

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
    if (!navigator.geolocation) {
      setErrorGps('El navegador no soporta geolocalización automática.');
      return;
    }
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
        setErrorGps('El GPS tardó demasiado o está desactivado. Haz clic directamente en el mapa para ubicar tu dirección.');
        setLoadingGps(false);
      },
      {
        timeout: 25000,
        maximumAge: 60000,
        enableHighAccuracy: false
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
    setMensajeBanner('');
    try {
      await createMiDireccion({
        ...form,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      });

      sessionStorage.setItem('ubicacionValidada', 'true');

      if (onSuccessRedirect) {
        navigate(onSuccessRedirect, { replace: true });
        return;
      }

      await cargarDirecciones();
      setForm({ alias: '', direccion: '', piso: '', departamento: '', referencia: '', latitud: '', longitud: '', es_principal: false });
      setMapPosition(null);
      setErrorGps('');
      setMensajeBanner('✓ Dirección guardada exitosamente.');
    } catch (err) {
      setErrorGps(err.response?.data?.error || 'Error al guardar la dirección.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!idAEliminar) return;
    try {
      await deleteMiDireccion(idAEliminar);
      setIdAEliminar(null);
      setMensajeBanner('✓ Dirección eliminada correctamente.');
      cargarDirecciones();
    } catch (err) {
      setIdAEliminar(null);
      setErrorGps('Ocurrió un error al intentar eliminar la dirección.');
    }
  };

  const tieneGps = Boolean(form.latitud && form.longitud);

  return (
    <div className="sd-addresses-card">
      <h3 className="admin-subtitle" style={{ margin: 0 }}>📍 Mis Ubicaciones Guardadas</h3>

      {mensajeBanner && (
        <div className="admin-banner admin-banner--success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{mensajeBanner}</span>
          <button onClick={() => setMensajeBanner('')} className="admin-btn admin-btn--ghost admin-btn--sm">✕</button>
        </div>
      )}

      {direcciones.length === 0 ? (
        <p className="admin-muted">No tienes direcciones guardadas.</p>
      ) : (
        <ul className="sd-addresses-list">
          {direcciones.map(dir => {
            const esPrincipal = Number(dir.es_principal) === 1;
            const esUbicacionActual = 
              (dir.alias && (dir.alias.includes('Ubicación Actual') || dir.alias.includes('Ubicacion Actual'))) ||
              (dir.direccion && dir.direccion.startsWith('Lat:'));

            const sePuedeEliminar = !esPrincipal && !esUbicacionActual;

            return (
              <li key={dir.id} className="sd-address-item">
                <div className="sd-address-info">
                  <div>
                    <strong>[{dir.alias}]</strong> {dir.direccion} {dir.piso ? `(Piso ${dir.piso} ${dir.departamento || ''})` : ''}
                    {esPrincipal && <span className="sd-address-badge">★ Principal</span>}
                  </div>
                </div>

                {sePuedeEliminar ? (
                  <button 
                    onClick={() => setIdAEliminar(dir.id)} 
                    className="admin-icon-btn"
                    title="Eliminar dirección"
                  >
                    🗑️
                  </button>
                ) : (
                  <span className="admin-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {esPrincipal ? 'Protegida (Principal)' : 'Protegida (Actual)'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {idAEliminar && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-aviso-box">
            <div className="admin-modal-aviso-icon admin-modal-aviso-icon--warning">⚠️</div>
            <h3>Confirmar Eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar esta dirección de tus ubicaciones guardadas?</p>
            <div className="admin-modal-aviso-actions">
              <button
                onClick={() => setIdAEliminar(null)}
                className="admin-btn admin-btn--outline"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                className="admin-btn admin-btn--danger"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {permitirAgregar && (
        <form onSubmit={handleSubmit} className="admin-form" style={{ marginTop: '12px' }}>
          <h4 className="admin-subtitle">➕ Agregar Nueva Ubicación</h4>

          <div className="admin-field">
            <label className="admin-field__label">Alias:</label>
            <input name="alias" placeholder="Ej: Casa, Trabajo" value={form.alias} onChange={handleChange} required className="admin-input" />
          </div>

          <div className="admin-field">
            <label className="admin-field__label">Dirección:</label>
            <input name="direccion" placeholder="Calle y Altura (ej: Av. San Martín 450)" value={form.direccion} onChange={handleChange} required className="admin-input" />
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-field__label">Piso (opcional):</label>
              <input name="piso" placeholder="Ej: 4" value={form.piso} onChange={handleChange} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-field__label">Depto (opcional):</label>
              <input name="departamento" placeholder="Ej: B" value={form.departamento} onChange={handleChange} className="admin-input" />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-field__label">Referencia de entrega (opcional):</label>
            <input name="referencia" placeholder="Ej: Portón blanco, entre calle X e Y" value={form.referencia} onChange={handleChange} className="admin-input" />
          </div>

          <div className="admin-field" style={{ margin: '4px 0' }}>
            <label className="admin-field__label">
              Selecciona tu ubicación exacta en el mapa: <span className="admin-text-error">*</span>
            </label>
            <small className="admin-muted">
              Haz clic en el mapa o usa el botón de GPS para centrar automáticamente el marcador.
            </small>

            <div className="sd-map-wrapper">
              <MapContainer center={mapPosition || defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController center={mapPosition} />
                <LocationSelector position={mapPosition} setPosition={setMapPosition} />
              </MapContainer>
            </div>
          </div>

          <div className={`sd-gps-status ${tieneGps ? 'sd-gps-status--success' : 'sd-gps-status--warning'}`}>
            <span>
              {tieneGps ? '✓ Ubicación seleccionada en el mapa' : '⚠ Aún no has marcado tu ubicación'}
            </span>
            <button
              type="button"
              onClick={handleObtenerGpsActual}
              disabled={loadingGps}
              className="admin-btn admin-btn--outline admin-btn--sm"
            >
              {loadingGps ? '⏳ Buscando...' : '🎯 Usar mi GPS actual'}
            </button>
          </div>

          {errorGps && (
            <div className="admin-banner admin-banner--error">
              <span>⚠️</span>
              <span>{errorGps}</span>
            </div>
          )}

          <div className="admin-check-row" style={{ marginTop: '4px' }}>
            <label className="admin-check">
              <input type="checkbox" name="es_principal" checked={form.es_principal} onChange={handleChange} />
              Establecer como dirección principal
            </label>
          </div>

          <button type="submit" disabled={submitting} className="admin-btn admin-btn--success admin-btn--block" style={{ marginTop: '8px' }}>
            {submitting ? 'Guardando...' : '💾 Guardar Dirección'}
          </button>
        </form>
      )}
    </div>
  );
};