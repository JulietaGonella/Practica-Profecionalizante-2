import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Cargando sesión...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🔴 Si debe cambiar contraseña y NO está en la pantalla de actualizar, redirigir
  if (user.debe_cambiar_pass && location.pathname !== '/actualizar-password-inicial') {
    return <Navigate to="/actualizar-password-inicial" replace />;
  }

  const userRol = user.rol ? user.rol.toLowerCase() : '';
  const rolesPermitidos = allowedRoles.map(r => r.toLowerCase());

  if (allowedRoles.length > 0 && !rolesPermitidos.includes(userRol)) {
    if (userRol === 'cliente') return <Navigate to="/cliente/inicio" replace />;
    if (userRol === 'local' || userRol === 'administrador local') return <Navigate to="/local/inicio" replace />;
    if (userRol === 'repartidor') return <Navigate to="/repartidor/inicio" replace />;
    if (userRol === 'administrador') return <Navigate to="/admin/inicio" replace />;

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};