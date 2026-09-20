import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  crearLocalCompletoAdmin,
  crearRepartidorCompletoAdmin
} from '../../api/adminService';

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

  const inputStyle = {
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    fontSize: '0.95rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#495057'
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ color: '#212529', marginBottom: '1.5rem' }}>Crear cuenta y perfil</h2>

      {banner.texto && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.9rem 1rem',
            borderRadius: '8px',
            backgroundColor: banner.tipo === 'success' ? '#e6fcf5' : '#fff5f5',
            border: `1px solid ${banner.tipo === 'success' ? '#a9eec2' : '#ffc9c9'}`,
            color: banner.tipo === 'success' ? '#087f5b' : '#c92a2a',
            fontWeight: 'bold'
          }}
        >
          {banner.texto}
        </div>
      )}

      {/* Selector de Perfil */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleTipoChange('local')}
          style={{
            flex: 1,
            backgroundColor: tipo === 'local' ? '#2b8a3e' : '#f1f3f5',
            color: tipo === 'local' ? '#fff' : '#495057',
            padding: '0.75rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Local
        </button>

        <button
          onClick={() => handleTipoChange('repartidor')}
          style={{
            flex: 1,
            backgroundColor: tipo === 'repartidor' ? '#d9480f' : '#f1f3f5',
            color: tipo === 'repartidor' ? '#fff' : '#495057',
            padding: '0.75rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Repartidor
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1.25rem' }}>

        {/* Sección: Datos de Cuenta */}
        <div style={cardStyle}>
          <strong style={{ color: '#343a40', fontSize: '1rem', borderBottom: '1px solid #f1f3f5', paddingBottom: '0.5rem' }}>
            🔐 Datos de la Cuenta
          </strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <input
              name="username"
              value={usuarioForm.username}
              onChange={handleUsuarioChange}
              placeholder="Nombre de usuario"
              style={inputStyle}
            />
            <input
              name="email"
              type="email"
              value={usuarioForm.email}
              onChange={handleUsuarioChange}
              placeholder="Correo Electrónico"
              style={inputStyle}
            />
            <input
              name="password"
              type="password"
              value={usuarioForm.password}
              onChange={handleUsuarioChange}
              placeholder="Contraseña"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Sección: Datos del Local y Ubicación Híbrida */}
        {tipo === 'local' && (
          <div style={cardStyle}>
            <strong style={{ color: '#343a40', fontSize: '1rem', borderBottom: '1px solid #f1f3f5', paddingBottom: '0.5rem' }}>
              🏪 Información del Local y Ubicación
            </strong>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <input
                name="nombre"
                value={perfilForm.nombre}
                onChange={handlePerfilChange}
                placeholder="Nombre del local"
                style={inputStyle}
              />

              {/* Input de Dirección con Autocompletado */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    name="direccion"
                    value={perfilForm.direccion}
                    onChange={handleDireccionChange}
                    placeholder="Dirección del local (ej. San Martín 123)"
                    style={inputStyle}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarDireccion}
                    disabled={buscandoDireccion}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: buscandoDireccion ? '#adb5bd' : '#2b8a3e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: buscandoDireccion ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {buscandoDireccion ? '⏳ Buscando...' : '🔍 Buscar'}
                  </button>
                </div>

                {/* Lista de sugerencias desplegables */}
                {sugerencias.length > 0 && (
                  <ul
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #ced4da',
                      borderRadius: '0 0 6px 6px',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {sugerencias.map((item, index) => (
                      <li
                        key={index}
                        onClick={() => seleccionarSugerencia(item)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          fontSize: '0.9rem',
                          borderBottom: index < sugerencias.length - 1 ? '1px solid #f1f3f5' : 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        📍 {item.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Contenedor del Mapa Interactivo */}
              <div style={{ height: '320px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ced4da' }}>
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

              <small style={{ color: '#6c757d' }}>
                💡 Escribe la dirección para ver sugerencias y selecciona una, o haz clic / arrastra el marcador en el mapa.
              </small>

              {/* Coordenadas sincronizadas automáticamente */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                  name="latitud"
                  value={ubicacionLocal.latitud}
                  placeholder="Latitud"
                  style={{ ...inputStyle, backgroundColor: '#f8f9fa' }}
                  readOnly
                />
                <input
                  name="longitud"
                  value={ubicacionLocal.longitud}
                  placeholder="Longitud"
                  style={{ ...inputStyle, backgroundColor: '#f8f9fa' }}
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {/* Sección: Datos del Repartidor */}
        {tipo === 'repartidor' && (
          <div style={cardStyle}>
            <strong style={{ color: '#343a40', fontSize: '1rem', borderBottom: '1px solid #f1f3f5', paddingBottom: '0.5rem' }}>
              🛵 Perfil de Repartidor
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input
                name="dni"
                value={perfilForm.dni}
                onChange={handlePerfilChange}
                placeholder="DNI del repartidor"
                style={inputStyle}
              />
              <select
                name="IDtipo_vehiculo"
                value={perfilForm.vehiculo.IDtipo_vehiculo}
                onChange={handleVehiculoChange}
                style={inputStyle}
              >
                <option value="">Seleccione tipo de vehículo</option>
                <option value="4">Auto</option>
                <option value="3">Moto</option>
                <option value="2">Bicicleta</option>
              </select>
            </div>

            {(tipoVehiculoActual === '3' || tipoVehiculoActual === '4') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>

                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#495057', display: 'block', marginBottom: '0.75rem' }}>
                    DETALLES DEL VEHÍCULO
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    <input
                      name="marca"
                      value={perfilForm.vehiculo.marca}
                      onChange={handleVehiculoChange}
                      placeholder="Marca"
                      style={inputStyle}
                    />
                    <input
                      name="modelo"
                      value={perfilForm.vehiculo.modelo}
                      onChange={handleVehiculoChange}
                      placeholder="Modelo"
                      style={inputStyle}
                    />
                    <input
                      name="anio"
                      type="number"
                      value={perfilForm.vehiculo.anio}
                      onChange={handleVehiculoChange}
                      placeholder="Año (Ej: 2022)"
                      style={inputStyle}
                    />
                    <input
                      name="patente"
                      value={perfilForm.vehiculo.patente}
                      onChange={handleVehiculoChange}
                      placeholder="Patente"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="seguro_vigente"
                        checked={perfilForm.vehiculo.seguro_vigente}
                        onChange={handleVehiculoChange}
                      />
                      Seguro vigente
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
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

                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#495057', display: 'block', marginBottom: '0.75rem' }}>
                    FECHAS DE VENCIMIENTO
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <label style={labelStyle}>
                      Vencimiento Licencia
                      <input
                        type="date"
                        name="fecha_vencimiento_licencia"
                        value={perfilForm.vehiculo.fecha_vencimiento_licencia}
                        onChange={handleVehiculoChange}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      Vencimiento Seguro
                      <input
                        type="date"
                        name="fecha_vencimiento_seguro"
                        value={perfilForm.vehiculo.fecha_vencimiento_seguro}
                        onChange={handleVehiculoChange}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      Vencimiento Cédula
                      <input
                        type="date"
                        name="fecha_vencimiento_cedula"
                        value={perfilForm.vehiculo.fecha_vencimiento_cedula}
                        onChange={handleVehiculoChange}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#495057', display: 'block', marginBottom: '0.75rem' }}>
                    DOCUMENTACIÓN EN ADJUNTO
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <label style={labelStyle}>
                      Cédula Verde/Azul
                      <input type="file" name="cedula" accept="image/*,.pdf" onChange={handleFileChange} style={{ fontSize: '0.8rem' }} />
                    </label>

                    <label style={labelStyle}>
                      Comprobante Seguro
                      <input type="file" name="seguro" accept="image/*,.pdf" onChange={handleFileChange} style={{ fontSize: '0.8rem' }} />
                    </label>

                    <label style={labelStyle}>
                      Licencia de Conducir
                      <input type="file" name="licencia" accept="image/*,.pdf" onChange={handleFileChange} style={{ fontSize: '0.8rem' }} />
                    </label>
                  </div>
                </div>

              </div>
            )}

            {tipoVehiculoActual === '2' && (
              <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
          </div>
        )}

        <button
          onClick={crearUsuarioYPerfil}
          disabled={loading}
          style={{
            padding: '1rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#1c7ed6',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            marginTop: '0.5rem',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? '⏳ Creando...' : 'Crear cuenta y perfil'}
        </button>
      </div>
    </div>
  );
};