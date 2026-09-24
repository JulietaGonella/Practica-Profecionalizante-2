import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  // 🔴 IMPORTANTE: Se eliminó el useEffect que dependía de [user]. 
  // Ese hook hacía que si cambiaba el estado, el formulario se reiniciara.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Intentamos loguear al usuario
      const userLogged = await login(email, password);
      
      // 2. Si las credenciales SON CORRECTAS:
      setError('');
      redirigirPorUsuario(userLogged);
    } catch (err) {
      // 3. Si las credenciales SON INCORRECTAS:
      // No redirige, no desmonta el componente, retiene los campos e imprime el mensaje.
      const mensajeError = err.response?.data?.error || err.message || 'Error al iniciar sesión';
      setError(mensajeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '3rem auto', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Iniciar Sesión</h2>
      
      {/* El cartel permanene visible con el mensaje del servidor */}
      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', color: '#721c24', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
          ⚠️ {error}
        </div>
      )}

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
          {isSubmitting ? '⏳ Cargando...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
        <Link to="/register">Regístrate como cliente</Link>
      </div>
    </div>
  );
};