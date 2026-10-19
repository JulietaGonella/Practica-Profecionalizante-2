// src/components/Cliente/MisDirecciones.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getMisDirecciones, createMiDireccion, deleteMiDireccion } from '../../api/clientesService';
import { calcularDistanciaKm } from '../../utils/geo';
import { Icon, sinEmoji } from './icon';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Marcador de la ubicación elegida: pin con el naranja de acción de SmartDrop
const PIN_UBICACION = '<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 45C18 45 3 29.5 3 17a15 15 0 0 1 30 0c0 12.5-15 28-15 28z" fill="#C45113" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="18" cy="17" r="6" fill="#ffffff"/></svg>';

const IconoUbicacion = L.divIcon({
  className: 'sd-map-pin',
  html: PIN_UBICACION,
  iconSize: [36, 46],
  iconAnchor: [18, 45]
});

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
    <Marker position={[position.lat, position.lng]} icon={IconoUbicacion} draggable={true} eventHandlers={{
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

      if (onSuccessRedirect) {
        // Se permite una única entrada después de guardar
        // la nueva ubicación solicitada por el guard.
        sessionStorage.setItem('ubicacionValidada', 'true');

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

  // Pantalla completa (bienvenida / validación de ubicación) o integrada en el perfil
  const esPaginaCompleta = Boolean(onSuccessRedirect);

  const tarjeta = (
    <div className="sd-addresses-card">
      <div className="sd-addresses-head">
        <h2 className="sd-addresses-title">
          <span className="sd-addresses-title__icon"><Icon name="pin" size={20} /></span>
          Mis Ubicaciones Guardadas
        </h2>
        <span className="admin-badge admin-badge--neutral">{direcciones.length}</span>
      </div>

      {mensajeBanner && (
        <div className="admin-banner admin-banner--success" role="status">
          <Icon name="checkCircle" size={18} />
          <span className="sd-banner-text">{sinEmoji(mensajeBanner)}</span>
          <button
            type="button"
            onClick={() => setMensajeBanner('')}
            className="admin-btn admin-btn--ghost admin-btn--sm"
            aria-label="Cerrar aviso"
          >
            <Icon name="x" size={14} />
          </button>
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
                <span className="sd-address-item__icon" aria-hidden="true">
                  <Icon name="pin" size={18} />
                </span>

                <div className="sd-address-info">
                  <div className="sd-address-info__top">
                    <strong>{dir.alias}</strong>
                    {esPrincipal && (
                      <span className="sd-address-badge">
                        <Icon name="star" size={12} filled /> Principal
                      </span>
                    )}
                  </div>
                  <span>{dir.direccion} {dir.piso ? `(Piso ${dir.piso} ${dir.departamento || ''})` : ''}</span>
                </div>

                {sePuedeEliminar ? (
                  <button
                    type="button"
                    onClick={() => setIdAEliminar(dir.id)}
                    className="admin-icon-btn"
                    title="Eliminar dirección"
                    aria-label={`Eliminar dirección ${dir.alias}`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                ) : (
                  <span className="sd-address-protect">
                    <Icon name="lock" size={12} />
                    {esPrincipal ? 'Protegida (Principal)' : 'Protegida (Actual)'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {idAEliminar && (
        <div className="admin-modal-aviso-overlay">
          <div className="admin-modal-aviso-box" role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación">
            <div className="admin-modal-aviso-icon admin-modal-aviso-icon--warning">
              <Icon name="alert" size={26} />
            </div>
            <h3>Confirmar Eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar esta dirección de tus ubicaciones guardadas?</p>
            <div className="admin-modal-aviso-actions">
              <button
                type="button"
                onClick={() => setIdAEliminar(null)}
                className="admin-btn admin-btn--outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                className="admin-btn admin-btn--danger"
              >
                <Icon name="trash" size={16} />
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {permitirAgregar && (
        <form onSubmit={handleSubmit} className="admin-form">
          <h3 className="sd-addresses-subtitle">
            <Icon name="plus" size={18} />
            Agregar Nueva Ubicación
          </h3>

          <div className="admin-field">
            <label htmlFor="dir-alias" className="admin-field__label">Alias</label>
            <input id="dir-alias" name="alias" placeholder="Ej: Casa, Trabajo" value={form.alias} onChange={handleChange} required className="admin-input" />
          </div>

          <div className="admin-field">
            <label htmlFor="dir-direccion" className="admin-field__label">Dirección</label>
            <input id="dir-direccion" name="direccion" placeholder="Calle y Altura (ej: Av. San Martín 450)" value={form.direccion} onChange={handleChange} required className="admin-input" />
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="dir-piso" className="admin-field__label">Piso (opcional)</label>
              <input id="dir-piso" name="piso" placeholder="Ej: 4" value={form.piso} onChange={handleChange} className="admin-input" />
            </div>
            <div className="admin-field">
              <label htmlFor="dir-departamento" className="admin-field__label">Depto (opcional)</label>
              <input id="dir-departamento" name="departamento" placeholder="Ej: B" value={form.departamento} onChange={handleChange} className="admin-input" />
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="dir-referencia" className="admin-field__label">Referencia de entrega (opcional)</label>
            <input id="dir-referencia" name="referencia" placeholder="Ej: Portón blanco, entre calle X e Y" value={form.referencia} onChange={handleChange} className="admin-input" />
          </div>

          <div className="admin-field">
            <span className="admin-field__label">
              Selecciona tu ubicación exacta en el mapa <span className="admin-text-error">*</span>
            </span>
            <small className="admin-muted">
              Haz clic en el mapa o usa el botón de GPS para centrar automáticamente el marcador.
            </small>

            <div className="sd-map-wrapper" role="region" aria-label="Mapa para seleccionar la ubicación">
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

          <div
            className={`sd-gps-status ${tieneGps ? 'sd-gps-status--success' : 'sd-gps-status--warning'}`}
            role="status"
          >
            <span className="sd-gps-status__text">
              <Icon name={tieneGps ? 'checkCircle' : 'alert'} size={18} />
              {tieneGps ? 'Ubicación seleccionada en el mapa' : 'Aún no has marcado tu ubicación'}
            </span>
            <button
              type="button"
              onClick={handleObtenerGpsActual}
              disabled={loadingGps}
              className="admin-btn admin-btn--outline admin-btn--sm"
            >
              {loadingGps ? (
                <><span className="sd-spinner sd-spinner--inline" aria-hidden="true" /> Buscando...</>
              ) : (
                <><Icon name="crosshair" size={16} /> Usar mi GPS actual</>
              )}
            </button>
          </div>

          {errorGps && (
            <div className="admin-banner admin-banner--error" role="alert">
              <Icon name="alert" size={18} />
              <span className="sd-banner-text">{errorGps}</span>
            </div>
          )}

          <div className="admin-check-row">
            <label className="admin-check">
              <input type="checkbox" name="es_principal" checked={form.es_principal} onChange={handleChange} />
              Establecer como dirección principal
            </label>
          </div>

          <button type="submit" disabled={submitting} className="admin-btn admin-btn--primary admin-btn--block sd-addresses-submit">
            {submitting ? (
              <><span className="sd-spinner sd-spinner--inline" aria-hidden="true" /> Guardando...</>
            ) : (
              <><Icon name="save" size={18} /> Guardar Dirección</>
            )}
          </button>
        </form>
      )}
    </div>
  );

  // Como pantalla completa (/cliente/direcciones) no está dentro de ClienteLayout:
  // se le da el mismo contenedor, fondo y marca que al resto del rol.
  if (esPaginaCompleta) {
    return (
      <div className="sd-container sd-container--page">
        <div className="sd-addresses-brand">
          <span className="sd-addresses-brand__mark" aria-hidden="true">
            <Icon name="pin" size={20} />
          </span>
          SmartDrop
        </div>
        {tarjeta}
      </div>
    );
  }

  return tarjeta;
};