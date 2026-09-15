import { useState } from 'react';
import {
  crearLocalCompletoAdmin,
  crearRepartidorCompletoAdmin
} from '../../api/adminService';

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

  const handleUbicacionLocalChange = (e) => {
    const { name, value } = e.target;
    setUbicacionLocal((prev) => ({
      ...prev,
      [name]: value
    }));
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
          throw new Error('Debes ingresar la latitud y longitud del local.');
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

  // Estilos reutilizables para homogeneizar los controles
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

        {/* Sección: Datos del Local */}
        {tipo === 'local' && (
          <div style={cardStyle}>
            <strong style={{ color: '#343a40', fontSize: '1rem', borderBottom: '1px solid #f1f3f5', paddingBottom: '0.5rem' }}>
              🏪 Información del Local
            </strong>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <input
                name="nombre"
                value={perfilForm.nombre}
                onChange={handlePerfilChange}
                placeholder="Nombre del local"
                style={inputStyle}
              />
              <input
                name="direccion"
                value={perfilForm.direccion}
                onChange={handlePerfilChange}
                placeholder="Dirección del local"
                style={inputStyle}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                  name="latitud"
                  value={ubicacionLocal.latitud}
                  onChange={handleUbicacionLocalChange}
                  placeholder="Latitud (ej. -31.41)"
                  style={inputStyle}
                />
                <input
                  name="longitud"
                  value={ubicacionLocal.longitud}
                  onChange={handleUbicacionLocalChange}
                  placeholder="Longitud (ej. -64.18)"
                  style={inputStyle}
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

            {/* Campos condicionales para Moto (3) y Auto (4) */}
            {(tipoVehiculoActual === '3' || tipoVehiculoActual === '4') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
                
                {/* Datos del Vehículo */}
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

                {/* Fechas de Vencimiento */}
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

                {/* Carga de Documentación */}
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

            {/* Opción única para Bicicleta */}
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