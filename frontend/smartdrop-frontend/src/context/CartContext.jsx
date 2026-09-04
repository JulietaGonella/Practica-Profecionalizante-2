// src/context/CartContext.jsx
import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Agregar o actualizar ítem en el carrito
  const agregarAlCarrito = (productoConfigurado) => {
    setCartItems((prev) => [...prev, productoConfigurado]);
  };

  // 🔄 Reordenar un pedido previo agregando sus productos al carrito
  const reordenarPedido = (productosDeOrden) => {
    // Mapeamos los productos del pedido anterior a la estructura que consume el Carrito
    const productosFormateados = productosDeOrden.map((prod) => ({
      id: prod.IDproducto,
      nombre: prod.producto,
      precio: Number(prod.precio_unitario),
      cantidad: prod.cantidad || 1,
      comentario: prod.comentario || '',
      opcionesIds: prod.opciones ? prod.opciones.map((o) => o.id) : [],
      opcionesDetalladas: prod.opciones || []
    }));

    // Reemplazamos el carrito existente
    setCartItems(productosFormateados);
  };

  // 🟢 Actualizar la cantidad de un producto específico
  const actualizarCantidad = (index, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      removerDelCarrito(index);
      return;
    }
    setCartItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  };

  // Remover ítem
  const removerDelCarrito = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Vaciar carrito
  const vaciarCarrito = () => setCartItems([]);

  // 🧮 Cálculos de totales
  const totalCantidad = cartItems.reduce(
    (sum, item) => sum + (item.cantidad || 1),
    0
  );

  const subtotalProductosBase = cartItems.reduce(
    (sum, item) => sum + Number(item.precio) * (item.cantidad || 1),
    0
  );

  const totalAdicionales = cartItems.reduce(
    (sum, item) => sum + Number(item.totalAdicionales || 0) * (item.cantidad || 1),
    0
  );

  const subtotalConAdicionales = subtotalProductosBase + totalAdicionales;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        agregarAlCarrito,
        reordenarPedido, // 👈 Exportado para consumir en MisPedidos
        actualizarCantidad,
        removerDelCarrito,
        vaciarCarrito,
        totalCantidad,
        subtotal: subtotalConAdicionales,
        subtotalProductosBase,
        totalAdicionales,
        subtotalConAdicionales
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);