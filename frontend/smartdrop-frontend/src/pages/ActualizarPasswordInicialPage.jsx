// src/pages/ActualizarPasswordInicialPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cambiarPasswordInicialApi } from '../api/authService';
import './Auth.css'; // 👈 Importamos los estilos unificados de autenticación

export const ActualizarPasswordInicialPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      await cambiarPasswordInicialApi(nuevaPassword);

      // Actualizar estado global y localStorage marcando debe_cambiar_pass = false
      const updatedUser = { ...user, debe_cambiar_pass: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Redirigir según su rol correspondiente
      const rol = updatedUser.rol ? updatedUser.rol.toLowerCase() : '';
      if (rol === 'cliente') navigate('/cliente/inicio', { replace: true });
      else if (rol === 'local' || rol === 'administrador local') navigate('/local/inicio', { replace: true });
      else if (rol === 'repartidor') navigate('/repartidor/inicio', { replace: true });
      else if (rol === 'administrador') navigate('/admin/inicio', { replace: true });
      else navigate('/login', { replace: true });

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al actualizar contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        
        <div className="auth-card__header">
          <h2 className="auth-card__title">🔒 Actualización Obligatoria</h2>
          <p className="auth-card__subtitle">
            Por razones de seguridad, debes definir una nueva contraseña personalizada antes de continuar.
          </p>
        </div>

        {error && (
          <div className="auth-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="nuevaPassword">Nueva Contraseña</label>
            <input 
              id="nuevaPassword"
              type="password" 
              className="auth-input"
              placeholder="Mínimo 8 caracteres" 
              value={nuevaPassword} 
              onChange={(e) => setNuevaPassword(e.target.value)} 
              disabled={isSubmitting}
              required 
            />
          </div>
          
          <div className="auth-field">
            <label htmlFor="confirmarPassword">Confirmar Nueva Contraseña</label>
            <input 
              id="confirmarPassword"
              type="password" 
              className="auth-input"
              placeholder="Repite tu contraseña" 
              value={confirmarPassword} 
              onChange={(e) => setConfirmarPassword(e.target.value)} 
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
                Guardando cambios...
              </>
            ) : (
              'Actualizar e Ingresar'
            )}
          </button>
        </form>

      </div>
    </div>
  );
};