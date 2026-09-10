import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRecuperacionApi } from '../api/authService';

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
    <div style={{ maxWidth: '400px', margin: '3rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>🔑 Recuperar Contraseña</h2>
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Ingresa tu correo registrado y te enviaremos un enlace de recuperación.
      </p>

      {mensaje && <p style={{ color: 'green', fontWeight: 'bold' }}>{mensaje}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Enlace de desarrollo para pruebas rápidas */}
      {debugUrl && (
        <div style={{ padding: '0.5rem', backgroundColor: '#e7f5ff', marginBottom: '1rem', borderRadius: '4px' }}>
          <small>🧪 <strong>Entorno de pruebas:</strong></small><br/>
          <a href={debugUrl} style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>Ir a Restablecer Clave Directo</a>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          disabled={loading}
          required 
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.6rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Enviando...' : 'Enviar Enlace de Recuperación'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        <small><Link to="/login">← Volver al inicio de sesión</Link></small>
      </p>
    </div>
  );
};