// src/components/LogoutButton.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 1. Importar useNavigate
import { useAuth } from '../context/AuthContext';

export const LogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate(); // 👈 2. Instanciar navigate
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true }); // 👈 3. Reemplazar historial al salir
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
      style={{ cursor: isLoggingOut ? 'not-allowed' : 'pointer' }}
    >
      {isLoggingOut ? '⏳ Cerrando sesión...' : 'Cerrar Sesión'}
    </button>
  );
};