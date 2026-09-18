// src/components/Cliente/ClienteGuard.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getMisDirecciones } from '../../api/clientesService';
import { calcularDistanciaKm } from '../../utils/geo';

export const ClienteGuard = () => {
  const [estadoValidacion, setEstadoValidacion] = useState({
    verificando: true,
    mensaje: 'Cargando aplicación...' // 👈 Mensaje más general y amigable
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si ya estamos en la pantalla de direcciones, no ejecutamos el guard para evitar bucles
    if (location.pathname === '/cliente/direcciones') {
      setEstadoValidacion({ verificando: false, mensaje: '' });
      return;
    }

    const validarUbicacionInicial = async () => {
      try {
        const direcciones = await getMisDirecciones();

        // 1. Si no tiene ninguna dirección registrada, redirigimos discretamente
        if (!direcciones || direcciones.length === 0) {
          setEstadoValidacion({
            verificando: true,
            mensaje: 'Preparando tu cuenta...'
          });
          navigate('/cliente/direcciones', { replace: true });
          return;
        }

        // 2. Validar con GPS actual del navegador en segundo plano
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latActual = pos.coords.latitude;
              const lngActual = pos.coords.longitude;
              
              // 🔍 Rango estricto de tolerancia: 0.15 km = 150 metros a la redonda
              const TOLERANCIA_KM = 0.15; 

              // Comprobamos si el usuario está cerca de ALGUNA de sus direcciones guardadas
              const estaCercaDeAlguna = direcciones.some(dir => {
                if (!dir.latitud || !dir.longitud) return false;
                const distancia = calcularDistanciaKm(
                  latActual,
                  lngActual,
                  Number(dir.latitud),
                  Number(dir.longitud)
                );
                return distancia <= TOLERANCIA_KM;
              });

              if (!estaCercaDeAlguna) {
                // Fuera de rango real comprobado por GPS
                setEstadoValidacion({
                  verificando: true,
                  mensaje: `Actualizando ubicación de entrega...`
                });
                navigate('/cliente/direcciones', { replace: true });
              } else {
                // Está dentro del rango, permitimos el acceso directo al panel
                setEstadoValidacion({ verificando: false, mensaje: '' });
              }
            },
            (err) => {
              console.warn('Error o denegación de geolocalización:', err);
              
              // Si el GPS falla pero ya tiene direcciones, lo dejamos pasar sin trabas
              setEstadoValidacion({ verificando: false, mensaje: '' });
            },
            { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
          );
        } else {
          setEstadoValidacion({ verificando: false, mensaje: '' });
        }
      } catch (err) {
        console.error('Error al validar la ubicación inicial:', err);
        setEstadoValidacion({ verificando: false, mensaje: '' });
      }
    };

    validarUbicacionInicial();
  }, [navigate, location.pathname]);

  if (estadoValidacion.verificando) {
    return (
      <div 
        style={{ 
          height: '100vh', 
          width: '100vw', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#f8f9fa',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99999,
          fontFamily: 'sans-serif',
          textAlign: 'center',
          padding: '1rem'
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🚀</div>
        <h2 style={{ color: '#333', margin: '0 0 0.5rem 0' }}>{estadoValidacion.mensaje}</h2>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>Por favor, espera un momento.</p>
      </div>
    );
  }

  return <Outlet />;
};