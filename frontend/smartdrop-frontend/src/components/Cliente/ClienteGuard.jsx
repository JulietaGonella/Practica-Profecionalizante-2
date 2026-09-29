// src/components/Cliente/ClienteGuard.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getMisDirecciones } from '../../api/clientesService';
import { calcularDistanciaKm } from '../../utils/geo';

export const ClienteGuard = () => {
  const [estadoValidacion, setEstadoValidacion] = useState({
    verificando: true,
    mensaje: 'Cargando aplicación...'
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Si ya estamos en la pantalla de direcciones, no ejecutamos la verificación
    if (location.pathname === '/cliente/direcciones') {
      setEstadoValidacion({ verificando: false, mensaje: '' });
      return;
    }

    // 2. Si la ubicación ya fue validada durante esta sesión, omitimos la prueba de GPS
    if (sessionStorage.getItem('ubicacionValidada') === 'true') {
      setEstadoValidacion({ verificando: false, mensaje: '' });
      return;
    }

    const validarUbicacionInicial = async () => {
      try {
        const direcciones = await getMisDirecciones();

        // Si no tiene direcciones registradas, redirigimos para que ingrese una
        if (!direcciones || direcciones.length === 0) {
          setEstadoValidacion({
            verificando: true,
            mensaje: 'Preparando tu cuenta...'
          });
          navigate('/cliente/direcciones', { replace: true });
          return;
        }

        // Se valida el GPS al inicio de la sesión
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latActual = pos.coords.latitude;
              const lngActual = pos.coords.longitude;
              const precisionGpsKm = (pos.coords.accuracy || 0) / 1000; // Margen de error del dispositivo en km
              
              // ⏱️ Tolerancia base ampliada a 600m (0.6 km) para compensar variaciones de Wi-Fi/IP en navegadores
              // Si el GPS reporta una imprecisión mayor, expandimos la tolerancia dinámicamente
              const TOLERANCIA_KM = Math.max(0.6, precisionGpsKm);

              // 🔍 Recorre TODAS las direcciones guardadas del cliente
              const estaCercaDeAlguna = direcciones.some((dir) => {
                const latDir = Number(dir.latitud);
                const lngDir = Number(dir.longitud);

                if (isNaN(latDir) || isNaN(lngDir)) return false;

                const distancia = calcularDistanciaKm(
                  latActual,
                  lngActual,
                  latDir,
                  lngDir
                );

                return distancia <= TOLERANCIA_KM;
              });

              if (!estaCercaDeAlguna) {
                // Fuera de rango de todas las direcciones guardadas
                setEstadoValidacion({
                  verificando: true,
                  mensaje: 'Actualizando ubicación de entrega...'
                });
                navigate('/cliente/direcciones', { replace: true });
              } else {
                // 🟢 Dentro del rango de al menos una dirección: permitimos el acceso directo
                sessionStorage.setItem('ubicacionValidada', 'true');
                setEstadoValidacion({ verificando: false, mensaje: '' });
              }
            },
            (err) => {
              console.warn('Error o denegación de geolocalización:', err);
              // Si falla el GPS pero la cuenta ya tiene direcciones registradas, se permite el paso
              sessionStorage.setItem('ubicacionValidada', 'true');
              setEstadoValidacion({ verificando: false, mensaje: '' });
            },
            { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
          );
        } else {
          sessionStorage.setItem('ubicacionValidada', 'true');
          setEstadoValidacion({ verificando: false, mensaje: '' });
        }
      } catch (err) {
        console.error('Error al validar la ubicación inicial:', err);
        sessionStorage.setItem('ubicacionValidada', 'true');
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