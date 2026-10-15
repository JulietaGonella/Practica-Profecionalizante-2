// src/pages/SolicitarRecuperacionPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRecuperacionApi } from '../api/authService';
import './Auth.css'; // 👈 Importamos los estilos unificados de autenticación

export const SolicitarRecuperacionPage = () => {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setDebugUrl('');
    setLoading(true);

    try {
      const res = await solicitarRecuperacionApi(email);
      setMensaje(res.message);
      
      // En entorno de desarrollo
      if (res.debugInfo?.resetUrl) {
        setDebugUrl(res.debugInfo.resetUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        
        <div className="auth-card__header">
          <h2 className="auth-card__title">🔑 Recuperar Contraseña</h2>
          <p className="auth-card__subtitle">
            Ingresa tu correo registrado y te enviaremos un enlace de recuperación.
          </p>
        </div>

        {mensaje && (
          <div className="admin-banner admin-banner--success" role="alert" style={{ marginBottom: '4px' }}>
            <span>✓</span>
            <span>{mensaje}</span>
          </div>
        )}

        {error && (
          <div className="auth-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Enlace de desarrollo para pruebas rápidas */}
        {debugUrl && (
          <div className="admin-inline-note admin-inline-note--info" style={{ wordBreak: 'break-all' }}>
            <span>🧪</span>
            <div>
              <strong>Entorno de pruebas:</strong><br />
              <a href={debugUrl} className="admin-link">Ir a Restablecer Clave Directo</a>
            </div>
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
                Enviando enlace...
              </>
            ) : (
              'Enviar Enlace de Recuperación'
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </div>

      </div>
    </div>
  );
};