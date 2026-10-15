// src/components/CambiarPasswordModal.jsx
import { useState } from 'react';
import { cambiarPasswordVoluntarioApi, cambiarPasswordInicialApi } from '../api/authService';
import './Components.css'; // O tu archivo de estilos correspondiente

export const CambiarPasswordModal = ({ onClose, esObligatorio = false }) => {
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (nuevaPassword.length < 8) {
      setError('La nueva clave debe tener al menos 8 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      let res;
      if (esObligatorio) {
        res = cambiarPasswordInicialApi ? await cambiarPasswordInicialApi(nuevaPassword) : null;
      } else {
        res = await cambiarPasswordVoluntarioApi(passwordActual, nuevaPassword);
      }

      setMensaje(res?.message || 'Contraseña actualizada correctamente.');
      setPasswordActual('');
      setNuevaPassword('');
      setConfirmarPassword('');
      if (onClose) setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="sd-modal-overlay" 
      onClick={!esObligatorio && onClose ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div 
        className="sd-pwd-card sd-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--sd-surface, #FFFFFF)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="sd-pwd-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--sd-navy, #17243A)' }}>
              🔐 {esObligatorio ? 'Actualizar Contraseña Inicial' : 'Cambiar Contraseña'}
            </h3>
            <p className="sd-muted" style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#667085' }}>
              {esObligatorio 
                ? 'Por seguridad, debes actualizar tu contraseña temporal en tu primer inicio de sesión.' 
                : 'Actualiza tus credenciales de acceso de forma segura.'}
            </p>
          </div>
          {!esObligatorio && onClose && (
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#667085' }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          )}
        </div>

        {mensaje && (
          <div className="sd-alert sd-alert--success" role="alert" style={{ marginBottom: '16px' }}>
            <span>✓</span>
            <span>{mensaje}</span>
          </div>
        )}

        {error && (
          <div className="sd-alert sd-alert--danger" role="alert" style={{ marginBottom: '16px' }}>
            <span>!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sd-form" style={{ display: 'grid', gap: '14px' }}>
          {!esObligatorio && (
            <label className="sd-field" style={{ display: 'grid', gap: '6px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--sd-navy, #17243A)' }}>Contraseña Actual</span>
              <input 
                type="password" 
                className="sd-input"
                placeholder="Ingresa tu contraseña actual" 
                value={passwordActual} 
                onChange={(e) => setPasswordActual(e.target.value)} 
                disabled={loading}
                required 
              />
            </label>
          )}

          <label className="sd-field" style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--sd-navy, #17243A)' }}>Nueva Contraseña</span>
            <input 
              type="password" 
              className="sd-input"
              placeholder="Mínimo 8 caracteres" 
              value={nuevaPassword} 
              onChange={(e) => setNuevaPassword(e.target.value)} 
              disabled={loading}
              required 
            />
          </label>

          <label className="sd-field" style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--sd-navy, #17243A)' }}>Confirmar Nueva Contraseña</span>
            <input 
              type="password" 
              className="sd-input"
              placeholder="Repite la nueva contraseña" 
              value={confirmarPassword} 
              onChange={(e) => setConfirmarPassword(e.target.value)} 
              disabled={loading}
              required 
            />
          </label>

          <div className="sd-pwd-actions" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="submit" 
              className="sd-btn sd-btn--primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading && <span className="sd-spinner sd-spinner--sm" />}
              {loading ? 'Guardando...' : 'Actualizar Clave'}
            </button>

            {onClose && (
              <button 
                type="button" 
                className="sd-btn sd-btn--outline"
                onClick={onClose} 
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};