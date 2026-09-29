// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

// ⏱️ Constante de expiración: 2 horas en milisegundos (2 * 60 * 60 * 1000)
const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

export const CartProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth?.user;

  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Obtener ID del usuario activo o definir clave para invitado
  const userId = user?.id || user?.IDusuario || user?.usuario_id || user?.id_usuario;
  const cartStorageKey = userId ? `cart_user_${userId}` : 'cart_guest';

  // 1️⃣ Cargar el carrito desde localStorage verificando la validez del timestamp (2 hs)
  useEffect(() => {
    setIsLoaded(false);
    try {
      const savedCartRaw = localStorage.getItem(cartStorageKey);

      if (savedCartRaw) {
        const parsed = JSON.parse(savedCartRaw);

        // Verificar si la estructura tiene timestamp de expiración
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.timestamp) {
          const tiempoTranscurrido = Date.now() - parsed.timestamp;

          if (tiempoTranscurrido < DOS_HORAS_MS) {
            setCartItems(parsed.items || []);
          } else {
            // ⏰ Pasaron más de 2 horas: se remueve del almacenamiento
            console.warn('El carrito ha expirado por inactividad (más de 2 horas). Vaciando...');
            localStorage.removeItem(cartStorageKey);
            setCartItems([]);
          }
        } 
        // Compatibilidad previa por si existía un array guardado directamente
        else if (Array.isArray(parsed)) {
          setCartItems(parsed);
        } else {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error al cargar el carrito desde localStorage:', error);
      setCartItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, [cartStorageKey]);

  // 2️⃣ Guardar el carrito junto con el timestamp actual al modificar productos
  useEffect(() => {
    if (!isLoaded) return;

    try {
      if (cartItems.length > 0) {
        const payload = {
          items: cartItems,
          timestamp: Date.now() // Refresca el temporizador de 2 horas desde la última interacción
        };
        localStorage.setItem(cartStorageKey, JSON.stringify(payload));
      } else {
        localStorage.removeItem(cartStorageKey);
      }
    } catch (error) {
      console.error('Error al guardar el carrito en localStorage:', error);
    }
  }, [cartItems, cartStorageKey, isLoaded]);

  // Agregar o actualizar ítem en el carrito
  const agregarAlCarrito = (productoConfigurado) => {
    setCartItems((prev) => [...prev, productoConfigurado]);
  };

  // Reordenar un pedido previo agregando sus productos al carrito
  const reordenarPedido = (productosDeOrden) => {
    const productosFormateados = productosDeOrden.map((prod) => ({
      id: prod.IDproducto,
      nombre: prod.producto,
      precio: Number(prod.precio_unitario),
      cantidad: prod.cantidad || 1,
      comentario: prod.comentario || '',
      opcionesIds: prod.opciones ? prod.opciones.map((o) => o.id) : [],
      opcionesDetalladas: prod.opciones || []
    }));

    setCartItems(productosFormateados);
  };

  // Actualizar la cantidad de un producto específico
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

  // Vaciar carrito del usuario activo
  const vaciarCarrito = () => {
    setCartItems([]);
    try {
      localStorage.removeItem(cartStorageKey);
    } catch (error) {
      console.error('Error al remover el carrito:', error);
    }
  };

  // Cálculos de totales
  const totalCantidad = cartItems.reduce(
    (sum, item) => sum + (item.cantidad || 1),
    0
  );

  const subtotalProductosBase = cartItems.reduce(
    (sum, item) => sum + Number(item.precio || 0) * (item.cantidad || 1),
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
        reordenarPedido,
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