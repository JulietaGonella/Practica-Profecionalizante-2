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
      bici_propia: false
    }
  });

  // Estado para los archivos adjuntos del vehículo
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

        // Construir el objeto normalizando los datos según el tipo de vehículo
        const vehiculoPayload = {
          IDtipo_vehiculo: Number(perfilForm.vehiculo.IDtipo_vehiculo),
          marca: esBicicleta ? null : (perfilForm.vehiculo.marca || null),
          modelo: esBicicleta ? null : (perfilForm.vehiculo.modelo || null),
          anio: esBicicleta || !perfilForm.vehiculo.anio ? null : Number(perfilForm.vehiculo.anio),
          patente: esBicicleta ? null : perfilForm.vehiculo.patente,
          seguro_vigente: esBicicleta ? false : perfilForm.vehiculo.seguro_vigente,
          licencia_vigente: esBicicleta ? false : perfilForm.vehiculo.licencia_vigente,
          bici_propia: esBicicleta ? perfilForm.vehiculo.bici_propia : false
        };

        // Construcción de FormData para enviar archivos y JSON serializado
        const formData = new FormData();
        formData.append('username', usuarioForm.username);
        formData.append('email', usuarioForm.email);
        formData.append('password', usuarioForm.password);
        formData.append('dni', perfilForm.dni);

        // El backend realiza JSON.parse(req.body.vehiculo)
        formData.append('vehiculo', JSON.stringify(vehiculoPayload));

        // Adjuntar archivos solo si NO es bicicleta y existen
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

      // Limpiar formulario
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
          bici_propia: false
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

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.2rem' }}>
      <h2>Crear cuenta y perfil</h2>

      {banner.texto && (
        <div
          style={{
            marginBottom: '1rem',
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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
        <button
          onClick={() => handleTipoChange('local')}
          style={{
            backgroundColor: tipo === 'local' ? '#2b8a3e' : '#e9ecef',
            color: tipo === 'local' ? '#fff' : '#333',
            padding: '0.7rem 1rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Local
        </button>

        <button
          onClick={() => handleTipoChange('repartidor')}
          style={{
            backgroundColor: tipo === 'repartidor' ? '#d9480f' : '#e9ecef',
            color: tipo === 'repartidor' ? '#fff' : '#333',
            padding: '0.7rem 1rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Repartidor
        </button>
      </div>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        <input
          name="username"
          value={usuarioForm.username}
          onChange={handleUsuarioChange}
          placeholder="Nombre de usuario"
        />

        <input
          name="email"
          value={usuarioForm.email}
          onChange={handleUsuarioChange}
          placeholder="Email"
        />

        <input
          name="password"
          type="password"
          value={usuarioForm.password}
          onChange={handleUsuarioChange}
          placeholder="Contraseña"
        />

        {tipo === 'local' && (
          <>
            <input
              name="nombre"
              value={perfilForm.nombre}
              onChange={handlePerfilChange}
              placeholder="Nombre del local"
            />

            <input
              name="direccion"
              value={perfilForm.direccion}
              onChange={handlePerfilChange}
              placeholder="Dirección del local"
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                name="latitud"
                value={ubicacionLocal.latitud}
                onChange={handleUbicacionLocalChange}
                placeholder="Latitud del local"
              />
              <input
                name="longitud"
                value={ubicacionLocal.longitud}
                onChange={handleUbicacionLocalChange}
                placeholder="Longitud del local"
              />
            </div>
          </>
        )}

        {tipo === 'repartidor' && (
          <>
            <input
              name="dni"
              value={perfilForm.dni}
              onChange={handlePerfilChange}
              placeholder="DNI"
            />

            <select
              name="IDtipo_vehiculo"
              value={perfilForm.vehiculo.IDtipo_vehiculo}
              onChange={handleVehiculoChange}
              style={{
                padding: '0.7rem',
                borderRadius: '6px',
                border: '1px solid #ced4da'
              }}
            >
              <option value="">Seleccione tipo de vehículo</option>
              <option value="4">Auto</option>
              <option value="2">Bicicleta</option>
              <option value="3">Moto</option>
            </select>

            {/* Marca, Modelo y Año solo se muestran para Moto (3) y Auto (4) */}
            {(tipoVehiculoActual === '3' || tipoVehiculoActual === '4') && (
              <>
                <input
                  name="marca"
                  value={perfilForm.vehiculo.marca}
                  onChange={handleVehiculoChange}
                  placeholder="Marca"
                />

                <input
                  name="modelo"
                  value={perfilForm.vehiculo.modelo}
                  onChange={handleVehiculoChange}
                  placeholder="Modelo"
                />

                <input
                  name="anio"
                  type="number"
                  value={perfilForm.vehiculo.anio}
                  onChange={handleVehiculoChange}
                  placeholder="Año del vehículo (Ej: 2022)"
                />

                <input
                  name="patente"
                  value={perfilForm.vehiculo.patente}
                  onChange={handleVehiculoChange}
                  placeholder="Patente"
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="seguro_vigente"
                    checked={perfilForm.vehiculo.seguro_vigente}
                    onChange={handleVehiculoChange}
                  />
                  Seguro vigente
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="licencia_vigente"
                    checked={perfilForm.vehiculo.licencia_vigente}
                    onChange={handleVehiculoChange}
                  />
                  Licencia vigente
                </label>

                {/* Campos de carga de archivos de documentación */}
                <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Foto/Archivo Cédula Verde/Azul:
                    <input type="file" name="cedula" accept="image/*,.pdf" onChange={handleFileChange} />
                  </label>

                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Foto/Archivo Comprobante Seguro:
                    <input type="file" name="seguro" accept="image/*,.pdf" onChange={handleFileChange} />
                  </label>

                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Foto/Archivo Licencia de Conducir:
                    <input type="file" name="licencia" accept="image/*,.pdf" onChange={handleFileChange} />
                  </label>
                </div>
              </>
            )}

            {/* Opciones exclusivas para Bicicleta */}
            {tipoVehiculoActual === '2' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="bici_propia"
                  checked={perfilForm.vehiculo.bici_propia}
                  onChange={handleVehiculoChange}
                />
                ¿Dispone de bicicleta propia?
              </label>
            )}
          </>
        )}

        <button
          onClick={crearUsuarioYPerfil}
          disabled={loading}
          style={{
            padding: '0.9rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#1c7ed6',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Creando...' : 'Crear cuenta y perfil'}
        </button>
      </div>
    </div>
  );
};