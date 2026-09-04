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
      patente: ''
    }
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
    const { name, value } = e.target;
    setPerfilForm((prev) => ({
      ...prev,
      vehiculo: {
        ...prev.vehiculo,
        [name]: value
      }
    }));
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

      if (!usuarioForm.username.trim()) {
        throw new Error('Debes ingresar un nombre de usuario.');
      }

      if (!usuarioForm.email.trim()) {
        throw new Error('Debes ingresar un email.');
      }

      if (!usuarioForm.password.trim()) {
        throw new Error('Debes ingresar una contraseña.');
      }

      if (tipo === 'local') {
        if (!ubicacionLocal.latitud || !ubicacionLocal.longitud) {
          throw new Error('Debes ingresar la latitud y longitud del local.');
        }
      }

      if (tipo === 'repartidor' && !perfilForm.dni.trim()) {
        throw new Error('Debes ingresar el DNI del repartidor.');
      }

      if (tipo === 'local') {
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
        await crearRepartidorCompletoAdmin({
          username: usuarioForm.username,
          email: usuarioForm.email,
          password: usuarioForm.password,
          dni: perfilForm.dni,
          vehiculo: {
            IDtipo_vehiculo: Number(
              perfilForm.vehiculo.IDtipo_vehiculo
            ),
            marca: perfilForm.vehiculo.marca,
            modelo: perfilForm.vehiculo.modelo,
            patente: perfilForm.vehiculo.patente
          }
        });
      }

      setBanner({
        tipo: 'success',
        texto: `${tipo === 'local' ? 'Local' : 'Repartidor'} creado correctamente.`
      });

      setUsuarioForm({
        username: '',
        email: '',
        password: ''
      });

      setPerfilForm({
        nombre: '',
        direccion: '',
        dni: '',
        vehiculo: {
          IDtipo_vehiculo: '',
          marca: '',
          modelo: '',
          patente: ''
        }
      });

      setUbicacionLocal({
        latitud: '',
        longitud: ''
      });
    } catch (err) {
      setBanner({
        tipo: 'error',
        texto:
          err.response?.data?.error ||
          err.message ||
          'Error al crear la cuenta y perfil.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.2rem' }}>
      <h2>Crear cuenta y perfil</h2>

      {banner.texto && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.9rem 1rem',
            borderRadius: '8px',
            backgroundColor:
              banner.tipo === 'success' ? '#e6fcf5' : '#fff5f5',
            border: `1px solid ${
              banner.tipo === 'success' ? '#a9eec2' : '#ffc9c9'
            }`,
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

            <p style={{ color: '#666', fontSize: '0.85rem' }}>
              📍 Próximamente: elegir la ubicación del local con un pin en el mapa.
            </p>
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
              <option value="1">A pie</option>
              <option value="4">Auto</option>
              <option value="2">Bicicleta</option>
              <option value="3">Moto</option>
            </select>

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
              name="patente"
              value={perfilForm.vehiculo.patente}
              onChange={handleVehiculoChange}
              placeholder="Patente"
            />
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