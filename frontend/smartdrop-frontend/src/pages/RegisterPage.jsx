import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    telefono: '',
    latitud: '',
    longitud: ''
  });

  const [error, setError] = useState('');
  const [loadingGps, setLoadingGps] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Obtener Ubicación GPS del navegador
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no es soportada por tu navegador.');
      return;
    }

    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }));
        setLoadingGps(false);
      },
      (err) => {
        setError('No se pudo obtener la ubicación. Por favor, ingresa los datos o activa el GPS.');
        setLoadingGps(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await registerClient({
        ...form,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud)
      });
      alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Registro de Cliente</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required />
        <br /><br />
        <input type="text" name="apellido" placeholder="Apellido" value={form.apellido} onChange={handleChange} required />
        <br /><br />
        <input type="text" name="username" placeholder="Nombre de usuario" value={form.username} onChange={handleChange} required />
        <br /><br />
        <input type="email" name="email" placeholder="Correo electrónico" value={form.email} onChange={handleChange} required />
        <br /><br />
        <input type="password" name="password" placeholder="Contraseña (mínimo 8 caracteres)" value={form.password} onChange={handleChange} required />
        <br /><br />
        <input type="text" name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} required />
        <br /><br />
        <input type="text" name="direccion" placeholder="Dirección de entrega" value={form.direccion} onChange={handleChange} required />
        <br /><br />

        <div style={{ border: '1px dashed #aaa', padding: '10px', marginBottom: '15px' }}>
          <button type="button" onClick={handleGetLocation} disabled={loadingGps}>
            {loadingGps ? 'Obteniendo GPS...' : '🎯 Capturar mi ubicación GPS actual'}
          </button>
          <p><small>Latitud: {form.latitud || 'No asignada'}</small></p>
          <p><small>Longitud: {form.longitud || 'No asignada'}</small></p>
        </div>

        <button type="submit">Registrarse</button>
      </form>

      <p><small>¿Ya tienes cuenta? <Link to="/login">Inicia Sesión</Link></small></p>
    </div>
  );
};