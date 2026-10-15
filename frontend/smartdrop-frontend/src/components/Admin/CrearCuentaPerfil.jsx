import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  crearLocalCompletoAdmin,
  crearRepartidorCompletoAdmin
} from '../../api/adminService';
import { Icon, Spinner, Banner, sinEmoji } from './AdminUI';
import './CSS/Administrador.css';

// Configuración de iconos por defecto para Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente auxiliar para recentrar y asegurar el redimensionamiento del mapa
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center.lat && center.lng) {
      map.setView([center.lat, center.lng], 16);
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }
  }, [center, map]);
  return null;
};

// Componente auxiliar para capturar clics en el mapa
const MapClickHandler = ({ setMarkerPosition, setUbicacionLocal }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPosition({ lat, lng });
      setUbicacionLocal({
        latitud: lat.toFixed(8),
        longitud: lng.toFixed(8)
      });
    },
  });
  return null;
};

export const CrearCuentaPerfilAdmin = () => {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('local');
  const [usuarioForm, setUsuarioForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [perfilForm, setPerfilForm] = useState({
    nombre: '',
    direccion: '',
    dni: '',
    vehiculo: {
      IDtipo_vehiculo: '',
      marca: '',
      modelo: '',
      anio: '',
      patente: '',
      seguro_vigente: false,
      licencia_vigente: false,
      bici_propia: false,
      fecha_vencimiento_licencia: '',
      fecha_vencimiento_seguro: '',
      fecha_vencimiento_cedula: ''
    }
  });

  const [archivosVehiculo, setArchivosVehiculo] = useState({
    cedula: null,
    seguro: null,
    licencia: null
  });

  const [ubicacionLocal, setUbicacionLocal] = useState({
    latitud: '',
    longitud: ''
  });

  // Estados para el mapa y geocodificación
  const [mapCenter, setMapCenter] = useState({ lat: -32.4080, lng: -63.2410 });
  const [markerPosition, setMarkerPosition] = useState({ lat: null, lng: null });

  // Estados para el autocompletado y estado de carga de la búsqueda
  const [sugerencias, setSugerencias] = useState([]);
  const [isSearchingSugerencias, setIsSearchingSugerencias] = useState(false);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);

  const [banner, setBanner] = useState({
    tipo: '',
    texto: ''
  });

  const [loading, setLoading] = useState(false);

  const handleTipoChange = (nextTipo) => {
    setTipo(nextTipo);
    setBanner({ tipo: '', texto: '' });
  };

  const handleUsuarioChange = (e) => {
    const { name, value } = e.target;
    setUsuarioForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePerfilChange = (e) => {
    const { name, value } = e.target;
    setPerfilForm((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador específico para la dirección con autocompletado en tiempo real
  const handleDireccionChange = async (e) => {
    const value = e.target.value;
    setPerfilForm((prev) => ({ ...prev, direccion: value }));

    if (value.trim().length > 2) {
      setIsSearchingSugerencias(true);
      try {
        // Llamada a tu backend en lugar de a Nominatim directamente
        const response = await fetch(`/api/locales/geocodificar?q=${encodeURIComponent(value)}`);
        const data = await response.json();
        setSugerencias(data || []);
      } catch (err) {
        console.error('Error al buscar sugerencias:', err);
        setSugerencias([]);
      } finally {
        setIsSearchingSugerencias(false);
      }
    } else {
      setSugerencias([]);
    }
  };
  
  // Seleccionar una sugerencia del menú desplegable
  const seleccionarSugerencia = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const newPos = { lat, lng: lon };

    setPerfilForm((prev) => ({ ...prev, direccion: item.display_name }));
    setMapCenter(newPos);
    setMarkerPosition(newPos);
    setUbicacionLocal({
      latitud: lat.toFixed(8),
      longitud: lon.toFixed(8)
    });
    setSugerencias([]);
  };

  const handleVehiculoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPerfilForm((prev) => ({
      ...prev,
      vehiculo: {
        ...prev.vehiculo,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setArchivosVehiculo((prev) => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  // Función de respaldo por si el usuario presiona el botón "Buscar" directamente
  const handleBuscarDireccion = async () => {
    if (!perfilForm.direccion.trim()) {
      setBanner({ tipo: 'error', texto: 'Ingresa una dirección para buscar en el mapa.' });
      return;
    }

    try {
      setBuscandoDireccion(true);
      setBanner({ tipo: '', texto: '' });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(perfilForm.direccion)}&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const newPos = { lat, lng: lon };

        setMapCenter(newPos);
        setMarkerPosition(newPos);
        setUbicacionLocal({
          latitud: lat.toFixed(8),
          longitud: lon.toFixed(8)
        });
        setSugerencias([]);
      } else {
        setBanner({ tipo: 'error', texto: 'No se encontró la ubicación para la dirección ingresada.' });
      }
    } catch (err) {
      setBanner({ tipo: 'error', texto: 'Error al consultar el servicio de geocodificación.' });
    } finally {
      setBuscandoDireccion(false);
    }
  };

  // Función cuando el usuario arrastra el marcador en el mapa
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const position = marker.getLatLng();
    setMarkerPosition(position);
    setUbicacionLocal({
      latitud: position.lat.toFixed(8),
      longitud: position.lng.toFixed(8)
    });
  };

  const crearUsuarioYPerfil = async () => {
    try {
      setLoading(true);
      setBanner({ tipo: '', texto: '' });

      if (!usuarioForm.username.trim()) throw new Error('Debes ingresar un nombre de usuario.');
      if (!usuarioForm.email.trim()) throw new Error('Debes ingresar un email.');
      if (!usuarioForm.password.trim()) throw new Error('Debes ingresar una contraseña.');

      if (tipo === 'local') {
        if (!ubicacionLocal.latitud || !ubicacionLocal.longitud) {
          throw new Error('Debes seleccionar la ubicación del local en el mapa.');
        }

        await crearLocalCompletoAdmin({
          username: usuarioForm.username,
          email: usuarioForm.email,
          password: usuarioForm.password,
          nombre: perfilForm.nombre,
          direccion: perfilForm.direccion,
          latitud: ubicacionLocal.latitud,
          longitud: ubicacionLocal.longitud
        });
      }

      if (tipo === 'repartidor') {
        if (!perfilForm.dni.trim()) {
          throw new Error('Debes ingresar el DNI del repartidor.');
        }

        const esBicicleta = String(perfilForm.vehiculo.IDtipo_vehiculo) === '2';

        const vehiculoPayload = {
          IDtipo_vehiculo: Number(perfilForm.vehiculo.IDtipo_vehiculo),
          marca: esBicicleta ? null : (perfilForm.vehiculo.marca || null),
          modelo: esBicicleta ? null : (perfilForm.vehiculo.modelo || null),
          anio: esBicicleta || !perfilForm.vehiculo.anio ? null : Number(perfilForm.vehiculo.anio),
          patente: esBicicleta ? null : perfilForm.vehiculo.patente,
          seguro_vigente: esBicicleta ? false : perfilForm.vehiculo.seguro_vigente,
          licencia_vigente: esBicicleta ? false : perfilForm.vehiculo.licencia_vigente,
          bici_propia: esBicicleta ? perfilForm.vehiculo.bici_propia : false,
          fecha_vencimiento_licencia: esBicicleta ? null : (perfilForm.vehiculo.fecha_vencimiento_licencia || null),
          fecha_vencimiento_seguro: esBicicleta ? null : (perfilForm.vehiculo.fecha_vencimiento_seguro || null),
          fecha_vencimiento_cedula: esBicicleta ? null : (perfilForm.vehiculo.fecha_vencimiento_cedula || null)
        };

        const formData = new FormData();
        formData.append('username', usuarioForm.username);
        formData.append('email', usuarioForm.email);
        formData.append('password', usuarioForm.password);
        formData.append('dni', perfilForm.dni);
        formData.append('vehiculo', JSON.stringify(vehiculoPayload));

        if (!esBicicleta) {
          if (archivosVehiculo.cedula) formData.append('cedula', archivosVehiculo.cedula);
          if (archivosVehiculo.seguro) formData.append('seguro', archivosVehiculo.seguro);
          if (archivosVehiculo.licencia) formData.append('licencia', archivosVehiculo.licencia);
        }

        await crearRepartidorCompletoAdmin(formData);
      }

      setBanner({
        tipo: 'success',
        texto: `${tipo === 'local' ? 'Local' : 'Repartidor'} creado correctamente.`
      });

      setUsuarioForm({ username: '', email: '', password: '' });
      setPerfilForm({
        nombre: '',
        direccion: '',
        dni: '',
        vehiculo: {
          IDtipo_vehiculo: '',
          marca: '',
          modelo: '',
          anio: '',
          patente: '',
          seguro_vigente: false,
          licencia_vigente: false,
          bici_propia: false,
          fecha_vencimiento_licencia: '',
          fecha_vencimiento_seguro: '',
          fecha_vencimiento_cedula: ''
        }
      });
      setArchivosVehiculo({ cedula: null, seguro: null, licencia: null });
      setUbicacionLocal({ latitud: '', longitud: '' });
      setMarkerPosition({ lat: null, lng: null });
      setSugerencias([]);

    } catch (err) {
      setBanner({
        tipo: 'error',
        texto: err.response?.data?.error || err.message || 'Error al crear la cuenta y perfil.'
      });
    } finally {
      setLoading(false);
    }
  };

  const tipoVehiculoActual = String(perfilForm.vehiculo.IDtipo_vehiculo);

  return (
    <div className="admin-page admin-scope">
      <div className="admin-page__inner">
        <div className="admin-page-head">
          <div className="admin-brand">
            <span className="admin-brand__mark" aria-hidden="true">
              <Icon name="users" size={24} />
            </span>
            <div>
              <h1>Crear cuenta y perfil</h1>
              <p>Dá de alta un local o un repartidor con su usuario de acceso.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/inicio')}
            className="admin-btn admin-btn--outline"
          >
            <Icon name="arrowLeft" />
            Volver
          </button>
        </div>

        {banner.texto && (
          <Banner tipo={banner.tipo}>{sinEmoji(banner.texto)}</Banner>
        )}

        {/* Selector de perfil */}
        <div className="admin-segmented" role="group" aria-label="Tipo de perfil" style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleTipoChange('local')}
            className={`admin-segmented__btn ${tipo === 'local' ? 'active' : ''}`}
            aria-pressed={tipo === 'local'}
          >
            <Icon name="store" />
            Local
          </button>

          <button
            type="button"
            onClick={() => handleTipoChange('repartidor')}
            className={`admin-segmented__btn ${tipo === 'repartidor' ? 'active' : ''}`}
            aria-pressed={tipo === 'repartidor'}
          >
            <Icon name="bike" />
            Repartidor
          </button>
        </div>

        <div className="admin-form-stack">

          {/* Sección: datos de cuenta */}
          <section className="admin-form-card">
            <h2 className="admin-form-card__title">
              <Icon name="key" size={18} />
              Datos de la cuenta
            </h2>
            <div className="admin-grid-auto">
              <label className="admin-field">
                <span>Nombre de usuario</span>
                <input
                  name="username"
                  value={usuarioForm.username}
                  onChange={handleUsuarioChange}
                  placeholder="Nombre de usuario"
                  className="admin-input"
                />
              </label>
              <label className="admin-field">
                <span>Correo electrónico</span>
                <input
                  name="email"
                  type="email"
                  value={usuarioForm.email}
                  onChange={handleUsuarioChange}
                  placeholder="Correo Electrónico"
                  className="admin-input"
                />
              </label>
              <label className="admin-field">
                <span>Contraseña</span>
                <input
                  name="password"
                  type="password"
                  value={usuarioForm.password}
                  onChange={handleUsuarioChange}
                  placeholder="Contraseña"
                  className="admin-input"
                />
              </label>
            </div>
          </section>

          {/* Sección: datos del local y ubicación híbrida */}
          {tipo === 'local' && (
            <section className="admin-form-card">
              <h2 className="admin-form-card__title">
                <Icon name="store" size={18} />
                Información del local y ubicación
              </h2>

              <div className="admin-form">
                <label className="admin-field">
                  <span>Nombre del local</span>
                  <input
                    name="nombre"
                    value={perfilForm.nombre}
                    onChange={handlePerfilChange}
                    placeholder="Nombre del local"
                    className="admin-input"
                  />
                </label>

                {/* Input de dirección con autocompletado */}
                <div className="admin-field">
                  <label htmlFor="direccion-local" className="admin-field__label">Dirección</label>
                  <div className="admin-address">
                    <div className="admin-address__row">
                      <input
                        id="direccion-local"
                        name="direccion"
                        value={perfilForm.direccion}
                        onChange={handleDireccionChange}
                        placeholder="Dirección del local (ej. San Martín 123)"
                        className="admin-input"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={handleBuscarDireccion}
                        disabled={buscandoDireccion}
                        className="admin-btn admin-btn--navy"
                      >
                        {buscandoDireccion ? (
                          <><Spinner /> Buscando...</>
                        ) : (
                          <><Icon name="search" size={16} /> Buscar</>
                        )}
                      </button>
                    </div>

                    {/* Lista de sugerencias desplegables */}
                    {sugerencias.length > 0 && (
                      <ul className="admin-suggest">
                        {sugerencias.map((item, index) => (
                          <li
                            key={index}
                            role="button"
                            tabIndex={0}
                            onClick={() => seleccionarSugerencia(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') seleccionarSugerencia(item);
                            }}
                          >
                            <Icon name="pin" size={14} />
                            <span>{item.display_name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {isSearchingSugerencias && (
                    <span className="admin-field-hint"><Spinner /> Buscando sugerencias...</span>
                  )}
                </div>

                {/* Contenedor del mapa interactivo */}
                <div className="admin-map-box">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={mapCenter} />
                    <MapClickHandler setMarkerPosition={setMarkerPosition} setUbicacionLocal={setUbicacionLocal} />
                    {markerPosition.lat && markerPosition.lng && (
                      <Marker
                        position={[markerPosition.lat, markerPosition.lng]}
                        draggable={true}
                        eventHandlers={{
                          dragend: handleMarkerDragEnd,
                        }}
                      />
                    )}
                  </MapContainer>
                </div>

                <p className="admin-inline-note admin-inline-note--info">
                  <Icon name="info" size={16} />
                  <span>
                    Escribe la dirección para ver sugerencias y selecciona una, o haz clic / arrastra el marcador en el mapa.
                  </span>
                </p>

                {/* Coordenadas sincronizadas automáticamente */}
                <div className="admin-grid-2">
                  <label className="admin-field">
                    <span>Latitud</span>
                    <input
                      name="latitud"
                      value={ubicacionLocal.latitud}
                      placeholder="Latitud"
                      className="admin-input admin-input--readonly"
                      readOnly
                    />
                  </label>
                  <label className="admin-field">
                    <span>Longitud</span>
                    <input
                      name="longitud"
                      value={ubicacionLocal.longitud}
                      placeholder="Longitud"
                      className="admin-input admin-input--readonly"
                      readOnly
                    />
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Sección: datos del repartidor */}
          {tipo === 'repartidor' && (
            <section className="admin-form-card">
              <h2 className="admin-form-card__title">
                <Icon name="bike" size={18} />
                Perfil de repartidor
              </h2>

              <div className="admin-grid-2">
                <label className="admin-field">
                  <span>DNI</span>
                  <input
                    name="dni"
                    value={perfilForm.dni}
                    onChange={handlePerfilChange}
                    placeholder="DNI del repartidor"
                    className="admin-input"
                  />
                </label>
                <label className="admin-field">
                  <span>Tipo de vehículo</span>
                  <select
                    name="IDtipo_vehiculo"
                    value={perfilForm.vehiculo.IDtipo_vehiculo}
                    onChange={handleVehiculoChange}
                    className="admin-input"
                  >
                    <option value="">Seleccione tipo de vehículo</option>
                    <option value="4">Auto</option>
                    <option value="3">Moto</option>
                    <option value="2">Bicicleta</option>
                  </select>
                </label>
              </div>

              {(tipoVehiculoActual === '3' || tipoVehiculoActual === '4') && (
                <div className="admin-form-stack" style={{ gap: '16px' }}>

                  <div className="admin-subbox">
                    <h3 className="admin-subbox__title">Detalles del vehículo</h3>
                    <div className="admin-grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>
                      <label className="admin-field">
                        <span>Marca</span>
                        <input
                          name="marca"
                          value={perfilForm.vehiculo.marca}
                          onChange={handleVehiculoChange}
                          placeholder="Marca"
                          className="admin-input"
                        />
                      </label>
                      <label className="admin-field">
                        <span>Modelo</span>
                        <input
                          name="modelo"
                          value={perfilForm.vehiculo.modelo}
                          onChange={handleVehiculoChange}
                          placeholder="Modelo"
                          className="admin-input"
                        />
                      </label>
                      <label className="admin-field">
                        <span>Año</span>
                        <input
                          name="anio"
                          type="number"
                          value={perfilForm.vehiculo.anio}
                          onChange={handleVehiculoChange}
                          placeholder="Año (Ej: 2022)"
                          className="admin-input"
                        />
                      </label>
                      <label className="admin-field">
                        <span>Patente</span>
                        <input
                          name="patente"
                          value={perfilForm.vehiculo.patente}
                          onChange={handleVehiculoChange}
                          placeholder="Patente"
                          className="admin-input"
                        />
                      </label>
                    </div>

                    <div className="admin-check-row">
                      <label className="admin-check">
                        <input
                          type="checkbox"
                          name="seguro_vigente"
                          checked={perfilForm.vehiculo.seguro_vigente}
                          onChange={handleVehiculoChange}
                        />
                        Seguro vigente
                      </label>

                      <label className="admin-check">
                        <input
                          type="checkbox"
                          name="licencia_vigente"
                          checked={perfilForm.vehiculo.licencia_vigente}
                          onChange={handleVehiculoChange}
                        />
                        Licencia vigente
                      </label>
                    </div>
                  </div>

                  <div className="admin-subbox">
                    <h3 className="admin-subbox__title">Fechas de vencimiento</h3>
                    <div className="admin-grid-auto">
                      <label className="admin-field">
                        <span>Vencimiento licencia</span>
                        <input
                          type="date"
                          name="fecha_vencimiento_licencia"
                          value={perfilForm.vehiculo.fecha_vencimiento_licencia}
                          onChange={handleVehiculoChange}
                          className="admin-input"
                        />
                      </label>

                      <label className="admin-field">
                        <span>Vencimiento seguro</span>
                        <input
                          type="date"
                          name="fecha_vencimiento_seguro"
                          value={perfilForm.vehiculo.fecha_vencimiento_seguro}
                          onChange={handleVehiculoChange}
                          className="admin-input"
                        />
                      </label>

                      <label className="admin-field">
                        <span>Vencimiento cédula</span>
                        <input
                          type="date"
                          name="fecha_vencimiento_cedula"
                          value={perfilForm.vehiculo.fecha_vencimiento_cedula}
                          onChange={handleVehiculoChange}
                          className="admin-input"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="admin-subbox">
                    <h3 className="admin-subbox__title">Documentación adjunta</h3>
                    <div className="admin-grid-auto">
                      <label className="admin-field admin-file">
                        <span>Cédula verde / azul</span>
                        <input type="file" name="cedula" accept="image/*,.pdf" onChange={handleFileChange} />
                        {archivosVehiculo.cedula && (
                          <span className="admin-file__name"><Icon name="check" size={12} /> {archivosVehiculo.cedula.name}</span>
                        )}
                      </label>

                      <label className="admin-field admin-file">
                        <span>Comprobante de seguro</span>
                        <input type="file" name="seguro" accept="image/*,.pdf" onChange={handleFileChange} />
                        {archivosVehiculo.seguro && (
                          <span className="admin-file__name"><Icon name="check" size={12} /> {archivosVehiculo.seguro.name}</span>
                        )}
                      </label>

                      <label className="admin-field admin-file">
                        <span>Licencia de conducir</span>
                        <input type="file" name="licencia" accept="image/*,.pdf" onChange={handleFileChange} />
                        {archivosVehiculo.licencia && (
                          <span className="admin-file__name"><Icon name="check" size={12} /> {archivosVehiculo.licencia.name}</span>
                        )}
                      </label>
                    </div>
                  </div>

                </div>
              )}

              {tipoVehiculoActual === '2' && (
                <div className="admin-subbox">
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      name="bici_propia"
                      checked={perfilForm.vehiculo.bici_propia}
                      onChange={handleVehiculoChange}
                    />
                    ¿Dispone de bicicleta propia?
                  </label>
                </div>
              )}
            </section>
          )}

          <button
            onClick={crearUsuarioYPerfil}
            disabled={loading}
            className="admin-btn admin-btn--primary admin-btn--lg admin-btn--block"
          >
            {loading ? (
              <><Spinner /> Creando...</>
            ) : (
              <><Icon name="plus" /> Crear cuenta y perfil</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};