import { Outlet } from 'react-router-dom';
import { NavbarCliente } from './NavbarCliente';
import { CartFloatingButton } from './CartFloatingButton';

export const ClienteLayout = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header Persistente */}
      <NavbarCliente />

      {/* Contenido Dinámico de la Ruta */}
      <main style={{ paddingBottom: '3rem' }}>
        <Outlet />
      </main>

      {/* Botón Flotante del Carrito (Persistente) */}
      <CartFloatingButton />
    </div>
  );
};