import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { restablecerPasswordApi } from '../api/authService';

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
    <div style={{ maxWidth: '420px', margin: '3rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>🔐 Restablecer Contraseña</h2>

      {exito ? (
        <div style={{ color: 'green', textAlign: 'center' }}>
          <p>✅ ¡Tu contraseña ha sido actualizada con éxito!</p>
          <p><small>Redirigiendo al login en unos segundos...</small></p>
          <Link to="/login">Ir al Login ahora</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <input 
            type="password" 
            placeholder="Nueva Contraseña (mínimo 8 caracteres)" 
            value={nuevaPassword} 
            onChange={(e) => setNuevaPassword(e.target.value)} 
            disabled={loading}
            required 
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          
          <input 
            type="password" 
            placeholder="Confirmar Nueva Contraseña" 
            value={confirmarPassword} 
            onChange={(e) => setConfirmarPassword(e.target.value)} 
            disabled={loading}
            required 
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.6rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ Actualizando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      )}
    </div>
  );
};