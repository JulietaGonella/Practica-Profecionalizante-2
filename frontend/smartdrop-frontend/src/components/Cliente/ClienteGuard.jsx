
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getMisDirecciones } from '../../api/clientesService';
import { calcularDistanciaKm } from '../../utils/geo';
import './CSS/Cliente.css';

const RANGO_MAXIMO_KM = 0.2; // 200 metros
const RUTA_DIRECCIONES = '/cliente/direcciones';
const RUTA_PANEL_CLIENTE = '/cliente';

const obtenerPosicionActual = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('El navegador no permite obtener la ubicación.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      reject,
      {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 30000
      }
    );
  });

const coordenadasValidas = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180 &&
  !(lat === 0 && lng === 0);

const obtenerCoordenadasDireccion = (dir) => {
  const latitud = dir.latitud ?? dir.lat ?? dir.latitude;
  const longitud =
    dir.longitud ?? dir.lng ?? dir.lon ?? dir.longitude;

  if (latitud == null || longitud == null) {
    return null;
  }

  const lat = Number(latitud);
  const lng = Number(longitud);

  return coordenadasValidas(lat, lng) ? { lat, lng } : null;
};

export const ClienteGuard = () => {
  const [estadoValidacion, setEstadoValidacion] = useState({
    verificando: true,
    mensaje: 'Preparando la validación de ubicación...'
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelado = false;

    const validarUbicacionInicial = async () => {
      const estadoSesion = sessionStorage.getItem('ubicacionValidada');

      // Ya se validó al iniciar sesión: no volver a pedir el GPS.
      if (estadoSesion === 'true') {
        setEstadoValidacion({
          verificando: false,
          mensaje: ''
        });
        return;
      }

      // El cliente está guardando una ubicación nueva.
      // Dejarlo trabajar sin repetir la validación.
      if (
        location.pathname === RUTA_DIRECCIONES &&
        estadoSesion === 'requiere-guardar'
      ) {
        setEstadoValidacion({
          verificando: false,
          mensaje: ''
        });
        return;
      }

      setEstadoValidacion({
        verificando: true,
        mensaje: 'Consultando tus direcciones guardadas...'
      });

      try {
        // 1. Consultar todas las direcciones guardadas.
        const direcciones = await getMisDirecciones();

        if (cancelado) return;

        if (!Array.isArray(direcciones)) {
          throw new Error('La respuesta de direcciones no es válida.');
        }

        // 2. Si no tiene direcciones, ir directamente a guardarlas.
        if (direcciones.length === 0) {
          sessionStorage.setItem(
            'ubicacionValidada',
            'requiere-guardar'
          );

          if (location.pathname !== RUTA_DIRECCIONES) {
            navigate(RUTA_DIRECCIONES, {
              replace: true,
              state: { motivo: 'sin-direcciones' }
            });
          } else {
            setEstadoValidacion({
              verificando: false,
              mensaje: ''
            });
          }

          return;
        }

        // 3. Obtener la ubicación actual.
        setEstadoValidacion({
          verificando: true,
          mensaje: 'Obteniendo tu ubicación actual...'
        });

        const actual = await obtenerPosicionActual();

        if (cancelado) return;

        const latActual = Number(actual.lat);
        const lngActual = Number(actual.lng);

        if (!coordenadasValidas(latActual, lngActual)) {
          throw new Error('El GPS no devolvió coordenadas válidas.');
        }

        // 4. Comparar la ubicación actual con TODAS las direcciones.
        setEstadoValidacion({
          verificando: true,
          mensaje: 'Comparando tu ubicación con las guardadas...'
        });

        const direccionesComparadas = direcciones.map((dir) => {
          const guardada = obtenerCoordenadasDireccion(dir);

          if (!guardada) {
            return {
              alias: dir.alias,
              valida: false,
              distanciaKm: null
            };
          }

          const distanciaKm = calcularDistanciaKm(
            latActual,
            lngActual,
            guardada.lat,
            guardada.lng
          );

          return {
            alias: dir.alias,
            valida: Number.isFinite(distanciaKm),
            distanciaKm
          };
        });

        console.table(direccionesComparadas);

        // Basta con que UNA dirección esté a 200 metros o menos.
        const coincide = direccionesComparadas.some(
          (dir) =>
            dir.valida &&
            dir.distanciaKm <= RANGO_MAXIMO_KM
        );

        if (cancelado) return;

        // 5. Si ninguna coincide, debe registrar la ubicación nueva.
        if (!coincide) {
          sessionStorage.setItem(
            'ubicacionValidada',
            'requiere-guardar'
          );

          if (location.pathname !== RUTA_DIRECCIONES) {
            navigate(RUTA_DIRECCIONES, {
              replace: true,
              state: { motivo: 'ubicacion-nueva' }
            });
          } else {
            setEstadoValidacion({
              verificando: false,
              mensaje: ''
            });
          }

          return;
        }

        // 6. Coincidencia encontrada: validar una sola vez por sesión.
        sessionStorage.setItem('ubicacionValidada', 'true');

        setEstadoValidacion({
          verificando: false,
          mensaje: ''
        });

        // Si ingresó directamente a Mis Direcciones, llevarlo al panel.
        if (location.pathname === RUTA_DIRECCIONES) {
          navigate(RUTA_PANEL_CLIENTE, { replace: true });
        }
      } catch (err) {
        if (cancelado) return;

        console.error('Error al validar la ubicación:', err);

        // No permitir el ingreso si no se pudo verificar el GPS.
        sessionStorage.setItem(
          'ubicacionValidada',
          'requiere-guardar'
        );

        let motivo = 'no-se-pudo-validar';

        if (err?.code === 1) {
          motivo = 'permiso-denegado';
        } else if (err?.code === 2) {
          motivo = 'ubicacion-no-disponible';
        } else if (err?.code === 3) {
          motivo = 'gps-timeout';
        }

        if (location.pathname !== RUTA_DIRECCIONES) {
          navigate(RUTA_DIRECCIONES, {
            replace: true,
            state: { motivo }
          });
        } else {
          setEstadoValidacion({
            verificando: false,
            mensaje: ''
          });
        }
      }
    };

    validarUbicacionInicial();

    return () => {
      cancelado = true;
    };
  }, [navigate, location.pathname]);



  if (estadoValidacion.verificando) {
    return (
      <div className="sd-guard-screen">
        <div className="sd-guard-card">
          <div className="sd-addresses-brand">
            <span
              className="sd-addresses-brand__mark"
              aria-hidden="true"
            >
              <icon name="map-pin" size="xl" />
            </span>
            SmartDrop
          </div>

          <span className="sd-spinner" aria-hidden="true" />

          <h2 className="sd-guard-title">
            Cargando tu experiencia...
          </h2>

          <p className="sd-guard-subtitle">
            Estamos preparando todo para que puedas continuar.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;

};
