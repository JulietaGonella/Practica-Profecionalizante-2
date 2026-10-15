// src/components/Cliente/ClienteGuard.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getMisDirecciones } from '../../api/clientesService';
import { calcularDistanciaKm } from '../../utils/geo';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados

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
              const precisionGpsKm = (pos.coords.accuracy || 0) / 1000;
              
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
      <div className="sd-guard-screen">
        <div className="sd-guard-card">
          <div className="sd-guard-icon">🚀</div>
          <span className="sd-spinner"></span>
          <h2 className="sd-guard-title">{estadoValidacion.mensaje}</h2>
          <p className="sd-guard-subtitle">Por favor, espera un momento.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};