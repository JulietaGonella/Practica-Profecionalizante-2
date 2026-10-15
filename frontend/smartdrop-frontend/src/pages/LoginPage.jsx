// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css'; // 👈 Importa los estilos unificados

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirigirPorUsuario = (usuario) => {
    if (!usuario) return;

    if (usuario.debe_cambiar_pass) {
      navigate('/actualizar-password-inicial', { replace: true });
      return;
    }

    const rol = usuario.rol ? usuario.rol.toLowerCase() : '';
    if (rol === 'cliente') navigate('/cliente/inicio', { replace: true });
    else if (rol === 'local' || rol === 'administrador local') navigate('/local/inicio', { replace: true });
    else if (rol === 'repartidor') navigate('/repartidor/inicio', { replace: true });
    else if (rol === 'administrador') navigate('/admin/inicio', { replace: true });
    else navigate('/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const userLogged = await login(email, password);
      sessionStorage.removeItem('ubicacionValidada');
      setError('');
      redirigirPorUsuario(userLogged);
    } catch (err) {
      const mensajeError = err.response?.data?.error || err.message || 'Error al iniciar sesión';
      setError(mensajeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        
        <div className="auth-card__header">
          <h2 className="auth-card__title">Iniciar Sesión</h2>
          <p className="auth-card__subtitle">Ingresá a tu cuenta de SmartDrop</p>
        </div>
        
        {error && (
          <div className="auth-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <button 
            type="submit" 
            className="admin-btn admin-btn--primary admin-btn--block" 
            disabled={isSubmitting}
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? (
              <>
                <span className="admin-spinner"></span>
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
          <Link to="/register">Regístrate</Link>
        </div>

      </div>
    </div>
  );
};