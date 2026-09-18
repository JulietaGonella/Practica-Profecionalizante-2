// src/components/Cliente/ClienteLayout.jsx
import { Outlet } from 'react-router-dom';
import { NavbarCliente } from './NavbarCliente';
import { CartFloatingButton } from './CartFloatingButton';

export const ClienteLayout = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <NavbarCliente />
      <main style={{ paddingBottom: '3rem' }}>
        <Outlet />
      </main>
      <CartFloatingButton />
    </div>
  );
};