// src/components/LogoutButton.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      sessionStorage.removeItem('ubicacionValidada');
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      disabled={isLoggingOut}
      className="admin-btn admin-btn--danger" // 👈 Clases idénticas a los botones de peligro del admin
    >
      {isLoggingOut ? (
        <>
          <span className="admin-spinner"></span>
          Cerrando...
        </>
      ) : (
        '🚪 Cerrar Sesión'
      )}
    </button>
  );
};