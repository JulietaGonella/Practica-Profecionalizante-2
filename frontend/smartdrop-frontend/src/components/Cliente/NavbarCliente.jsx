import { useNavigate, useLocation } from 'react-router-dom';
import { LogoutButton } from '../LogoutButton';

export const NavbarCliente = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Función para determinar si el botón coincide con la ruta activa
  const esActivo = (path) => {
    if (path === '/cliente/inicio') {
      return location.pathname === '/cliente/inicio';
    }
    return location.pathname.startsWith(path);
  };

  const getButtonStyle = (path) => ({
    padding: '0.5rem 0.9rem',
    backgroundColor: esActivo(path) ? '#1c7ed6' : 'transparent',
    color: esActivo(path) ? '#ffffff' : '#333333',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s, color 0.2s'
  });

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      justify: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <h2 
          onClick={() => navigate('/cliente/inicio')}
          style={{ margin: 0, fontSize: '1.25rem', color: '#1c7ed6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🛒 SmartDrop
        </h2>

        <nav style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button style={getButtonStyle('/cliente/inicio')} onClick={() => navigate('/cliente/inicio')}>
            🏠 Inicio
          </button>
          <button style={getButtonStyle('/cliente/locales')} onClick={() => navigate('/cliente/locales')}>
            🏪 Locales
          </button>
          <button style={getButtonStyle('/cliente/pedidos')} onClick={() => navigate('/cliente/pedidos')}>
            📦 Mis Pedidos
          </button>
          <button style={getButtonStyle('/cliente/perfil')} onClick={() => navigate('/cliente/perfil')}>
            👤 Mi Perfil
          </button>
        </nav>
      </div>

      <LogoutButton />
    </header>
  );
};