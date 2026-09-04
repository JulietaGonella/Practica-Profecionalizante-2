// src/components/Cliente/CartFloatingButton.jsx
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export const CartFloatingButton = () => {
  const { totalCantidad, subtotal } = useCart();
  const navigate = useNavigate();

  // Si no hay productos, no se muestra nada
  if (totalCantidad === 0) return null;

  return (
    <button
      onClick={() => navigate('/cliente/carrito')}
      style={{
        position: 'fixed',
        bottom: '25px',
        right: '25px',
        backgroundColor: '#2b8a3e',
        color: '#ffffff',
        border: 'none',
        borderRadius: '50px',
        padding: '0.9rem 1.4rem',
        fontSize: '1rem',
        fontWeight: 'bold',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
        cursor: 'pointer',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'transform 0.2s ease-in-out'
      }}
    >
      <span>🛒 Ver Carrito</span>
      <span style={{
        backgroundColor: '#ffffff',
        color: '#2b8a3e',
        borderRadius: '20px',
        padding: '0.2rem 0.6rem',
        fontSize: '0.85rem'
      }}>
        {totalCantidad} | ${subtotal.toFixed(2)}
      </span>
    </button>
  );
};