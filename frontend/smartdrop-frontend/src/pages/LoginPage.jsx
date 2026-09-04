// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { user, login } = useAuth(); // 👈 Obtener user
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 Si el usuario ya está autenticado e intenta entrar a /login, redirigir a su panel
  useEffect(() => {
    if (user) {
      const rol = user.rol ? user.rol.toLowerCase() : '';
      if (rol === 'cliente') navigate('/cliente/inicio', { replace: true });
      else if (rol === 'local' || rol === 'administrador local') navigate('/local/inicio', { replace: true });
      else if (rol === 'repartidor') navigate('/repartidor/inicio', { replace: true });
      else if (rol === 'administrador') navigate('/admin/inicio', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const userLogged = await login(email, password);
      const rol = userLogged.rol ? userLogged.rol.toLowerCase() : '';

      // 🟢 Reemplazar entrada en el historial con { replace: true }
      if (rol === 'cliente') navigate('/cliente/inicio', { replace: true });
      else if (rol === 'local' || rol === 'administrador local') navigate('/local/inicio', { replace: true });
      else if (rol === 'repartidor') navigate('/repartidor/inicio', { replace: true });
      else if (rol === 'administrador') navigate('/admin/inicio', { replace: true });
      else navigate('/login', { replace: true });

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

      <p><small>¿No tienes cuenta? <Link to="/register">Regístrate como cliente</Link></small></p>
    </div>
  );
};