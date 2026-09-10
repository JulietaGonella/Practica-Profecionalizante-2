import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cambiarPasswordInicialApi } from '../api/authService';

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
    <div style={{ maxWidth: '420px', margin: '3rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>🔒 Actualización Obligatoria de Contraseña</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Por razones de seguridad, debes definir una nueva contraseña personalizada antes de continuar.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <input 
          type="password" 
          placeholder="Nueva Contraseña (mínimo 8 caracteres)" 
          value={nuevaPassword} 
          onChange={(e) => setNuevaPassword(e.target.value)} 
          disabled={isSubmitting}
          required 
        />
        <br /><br />
        <input 
          type="password" 
          placeholder="Confirmar Nueva Contraseña" 
          value={confirmarPassword} 
          onChange={(e) => setConfirmarPassword(e.target.value)} 
          disabled={isSubmitting}
          required 
        />
        <br /><br />

        <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '0.6rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
          {isSubmitting ? '⏳ Guardando cambios...' : 'Actualizar e Ingresar'}
        </button>
      </form>
    </div>
  );
};