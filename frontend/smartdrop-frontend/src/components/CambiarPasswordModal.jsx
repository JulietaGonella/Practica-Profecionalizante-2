import { useState } from 'react';
import { cambiarPasswordVoluntarioApi, cambiarPasswordInicialApi } from '../api/authService';

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
        // Petición para el primer inicio de sesión (no requiere clave actual)
        res = await cambiarPasswordInicialApi(nuevaPassword);
      } else {
        // Petición para cambio voluntario desde el perfil (requiere clave actual)
        res = await cambiarPasswordVoluntarioApi(passwordActual, nuevaPassword);
      }

      setMensaje(res.message || 'Contraseña actualizada correctamente.');
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
    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', marginTop: '1rem' }}>
      <h4>🔐 {esObligatorio ? 'Actualizar Contraseña Inicial' : 'Cambiar Contraseña'}</h4>

      {mensaje && <p style={{ color: 'green', fontWeight: 'bold' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* Solo solicitar la contraseña actual si el cambio es voluntario */}
        {!esObligatorio && (
          <div style={{ marginBottom: '0.5rem' }}>
            <input 
              type="password" 
              placeholder="Contraseña Actual" 
              value={passwordActual} 
              onChange={(e) => setPasswordActual(e.target.value)} 
              disabled={loading}
              required 
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        )}

        <div style={{ marginBottom: '0.5rem' }}>
          <input 
            type="password" 
            placeholder="Nueva Contraseña (mín. 8 caracteres)" 
            value={nuevaPassword} 
            onChange={(e) => setNuevaPassword(e.target.value)} 
            disabled={loading}
            required 
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <input 
            type="password" 
            placeholder="Confirmar Nueva Contraseña" 
            value={confirmarPassword} 
            onChange={(e) => setConfirmarPassword(e.target.value)} 
            disabled={loading}
            required 
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '0.8rem' }}>
          <button 
            type="submit" 
            disabled={loading} 
            style={{ padding: '0.5rem 1rem', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Guardando...' : 'Actualizar Clave'}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};