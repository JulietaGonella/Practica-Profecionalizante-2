// src/utils/geo.js
export const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en kilómetros
};

const getPos = (opts) =>
  new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opts));

/**
 * Devuelve { lat, lng, accuracy, aproximada }
 * 1) precisión baja (rápida, usa caché) -> 2) precisión alta -> 3) IP (aproximada)
 */
export const obtenerPosicion = async () => {
  if (navigator.geolocation) {
    try {
      const p = await getPos({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, aproximada: false };
    } catch (err) {
      if (err.code === 1) throw err; // permiso denegado: no tiene sentido reintentar
      try {
        const p = await getPos({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
        return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, aproximada: false };
      } catch (_) { /* seguimos al fallback por IP */ }
    }
  }

  // Fallback por IP (precisión de ciudad, solo como último recurso)
  const r = await fetch('https://ipwho.is/');
  const d = await r.json();
  if (!d.success) throw new Error('No se pudo obtener la ubicación');
  return { lat: d.latitude, lng: d.longitude, accuracy: 5000, aproximada: true };
};