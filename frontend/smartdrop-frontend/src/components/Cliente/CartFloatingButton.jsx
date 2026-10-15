// src/components/Cliente/CartFloatingButton.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './CSS/Cliente.css'; // 👈 Importamos los estilos del cliente

export const CartFloatingButton = () => {
  const { totalCantidad, subtotal } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Si no hay productos o si estamos exactamente en la página del carrito, no se muestra
  if (totalCantidad === 0 || location.pathname === '/cliente/carrito') return null;

  return (
    <button
      onClick={() => navigate('/cliente/carrito')}
      className="sd-cart-floating"
    >
      <span>🛒 Ver Carrito</span>
      <span className="sd-cart-floating__badge">
        {totalCantidad} | ${subtotal.toFixed(2)}
      </span>
    </button>
  );
};