// src/components/Cliente/NavbarCliente.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { LogoutButton } from '../LogoutButton';
import { NotificationMenu } from '../Common/NotificationMenu';
import './CSS/Cliente.css'; // 👈 Importación de los estilos unificados

export const NavbarCliente = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const esActivo = (path) => {
    if (path === '/cliente/inicio') {
      return location.pathname === '/cliente/inicio';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sd-navbar">
      <div className="sd-navbar__brand">
        <h2
          onClick={() => navigate('/cliente/inicio')}
          className="sd-navbar__logo"
        >
          🛒 SmartDrop
        </h2>

        <nav className="sd-navbar__links">
          <button 
            className={`sd-navbar__link ${esActivo('/cliente/inicio') ? 'active' : ''}`} 
            onClick={() => navigate('/cliente/inicio')}
          >
            🏠 Inicio
          </button>
          <button 
            className={`sd-navbar__link ${esActivo('/cliente/locales') ? 'active' : ''}`} 
            onClick={() => navigate('/cliente/locales')}
          >
            🏪 Locales
          </button>
          <button 
            className={`sd-navbar__link ${esActivo('/cliente/pedidos') ? 'active' : ''}`} 
            onClick={() => navigate('/cliente/pedidos')}
          >
            📦 Mis Pedidos
          </button>
          <button 
            className={`sd-navbar__link ${esActivo('/cliente/perfil') ? 'active' : ''}`} 
            onClick={() => navigate('/cliente/perfil')}
          >
            👤 Mi Perfil
          </button>
          <button 
            className={`sd-navbar__link ${esActivo('/cliente/tablero') ? 'active' : ''}`} 
            onClick={() => navigate('/cliente/tablero')}
          >
            📊 Mi Tablero
          </button>
        </nav>
      </div>

      {/* Contenedor para Notificaciones + Logout */}
      <div className="sd-navbar__actions">
        <NotificationMenu />
        <LogoutButton />
      </div>
    </header>
  );
};