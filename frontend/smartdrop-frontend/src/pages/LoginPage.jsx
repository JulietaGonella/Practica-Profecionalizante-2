// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 Función unificada para resolver la navegación según el estado del usuario
  const redirigirPorUsuario = (usuario) => {
    if (!usuario) return;

    // 1️⃣ Si debe cambiar la contraseña obligatoriamente, redirigir a la pantalla de actualización
    if (usuario.debe_cambiar_pass) {
      navigate('/actualizar-password-inicial', { replace: true });
      return;
    }

    // 2️⃣ Si la contraseña está en orden, redirigir según su rol correspondiente
    const rol = usuario.rol ? usuario.rol.toLowerCase() : '';
    if (rol === 'cliente') navigate('/cliente/inicio', { replace: true });
    else if (rol === 'local' || rol === 'administrador local') navigate('/local/inicio', { replace: true });
    else if (rol === 'repartidor') navigate('/repartidor/inicio', { replace: true });
    else if (rol === 'administrador') navigate('/admin/inicio', { replace: true });
    else navigate('/login', { replace: true });
  };

  // 🟢 Si el usuario ya está autenticado e intenta ingresar a /login
  useEffect(() => {
    if (user) {
      redirigirPorUsuario(user);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const userLogged = await login(email, password);
      redirigirPorUsuario(userLogged);
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Iniciar Sesión</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
        <br /><br />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />
        <br /><br />

        <button type="submit" disabled={isSubmitting} style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
          {isSubmitting ? '⏳ Ingresando a la cuenta...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
        <Link to="/register">Regístrate como cliente</Link>
      </div>
    </div>
  );
};