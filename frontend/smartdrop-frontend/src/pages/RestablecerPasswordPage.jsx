// src/pages/RestablecerPasswordPage.jsx
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { restablecerPasswordApi } from '../api/authService';
import './Auth.css'; // 👈 Importamos los estilos unificados de autenticación

export const RestablecerPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('id');

  const navigate = useNavigate();

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !userId) {
      setError('El enlace de recuperación es inválido o está incompleto.');
      return;
    }

    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await restablecerPasswordApi(userId, token, nuevaPassword);
      setExito(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        
        <div className="auth-card__header">
          <h2 className="auth-card__title">🔐 Restablecer Contraseña</h2>
          <p className="auth-card__subtitle">Ingresa y confirma tu nueva contraseña</p>
        </div>

        {exito ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="admin-banner admin-banner--success" role="alert">
              <span>✓</span>
              <span>¡Tu contraseña ha sido actualizada con éxito!</span>
            </div>
            <p className="auth-card__subtitle" style={{ margin: 0 }}>Redirigiendo al login en unos segundos...</p>
            <div className="auth-footer-links" style={{ borderTop: 'none', paddingTop: 0 }}>
              <Link to="/login">Ir al Login ahora</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-banner" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="nuevaPassword">Nueva Contraseña</label>
              <input 
                id="nuevaPassword"
                type="password" 
                className="auth-input"
                placeholder="Mínimo 8 caracteres" 
                value={nuevaPassword} 
                onChange={(e) => setNuevaPassword(e.target.value)} 
                disabled={loading}
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
                disabled={loading}
                required 
              />
            </div>

            <button 
              type="submit" 
              className="admin-btn admin-btn--primary admin-btn--block" 
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <span className="admin-spinner"></span>
                  Actualizando...
                </>
              ) : (
                'Cambiar Contraseña'
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};