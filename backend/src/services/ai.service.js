// src/services/ai.service.js

// 📐 Calcular distancia en kilómetros entre dos coordenadas GPS (Haversine)
export const calcularDistanciaKM = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 💰 Algoritmo Dinámico para calcular el Costo de Envío Multiorigen
export const calcularCostoEnvioMultiorigen = (puntosRuta) => {
  const TARIFA_BASE = 500.00;
  const PRECIO_POR_KM = 250.00;
  const RECARGO_PARADA_EXTRA = 200.00;

  let distanciaTotal = 0;

  for (let i = 0; i < puntosRuta.length - 1; i++) {
    const origen = puntosRuta[i];
    const destino = puntosRuta[i + 1];
    distanciaTotal += calcularDistanciaKM(
      origen.latitud,
      origen.longitud,
      destino.latitud,
      destino.longitud
    );
  }

  const cantidadLocales = puntosRuta.length - 1;
  const recargoParadas = cantidadLocales > 1 ? (cantidadLocales - 1) * RECARGO_PARADA_EXTRA : 0;
  const costoFinal = TARIFA_BASE + (distanciaTotal * PRECIO_POR_KM) + recargoParadas;

  return {
    distanciaTotalKM: Number(distanciaTotal.toFixed(2)),
    costoEnvio: Number(costoFinal.toFixed(2))
  };
};

// 📍 Interpola coordenadas con paso constante (metros) para un avance fluido
export const interpolarDenseCoordinates = (puntos, pasoMetros = 20) => {
  if (!puntos || puntos.length === 0) return [];
  const result = [puntos[0]];

  for (let i = 0; i < puntos.length - 1; i++) {
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const distKm = calcularDistanciaKM(p1.latitud, p1.longitud, p2.latitud, p2.longitud);
    const distM = distKm * 1000;

    if (distM > pasoMetros) {
      const numPasos = Math.floor(distM / pasoMetros);
      for (let j = 1; j <= numPasos; j++) {
        const factor = j / (numPasos + 1);
        const lat = p1.latitud + (p2.latitud - p1.latitud) * factor;
        const lng = p1.longitud + (p2.longitud - p1.longitud) * factor;
        result.push({
          latitud: Number(lat.toFixed(8)),
          longitud: Number(lng.toFixed(8))
        });
      }
    }
    result.push(p2);
  }

  return result;
};

// 🗺️ Obtener ruta real sobre calles de la ciudad mediante OSRM
// src/services/ai.service.js

export const obtenerRutaCallesOSRM = async (origen, destino) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origen.longitud},${origen.latitud};${destino.longitud},${destino.latitud}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Respuesta no válida de OSRM');

    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      const puntosGeo = coords.map(([lng, lat]) => ({
        latitud: Number(lat.toFixed(8)),
        longitud: Number(lng.toFixed(8))
      }));
      // ⚡ Subdividir con mayor separación entre puntos para agilizar el recorrido
      return interpolarDenseCoordinates(puntosGeo, 50); // 👈 Cambiado de 25 a 50
    }
  } catch (error) {
    console.warn('⚠️ OSRM indisponible, utilizando ruta interpolada de respaldo:', error.message);
  }

  // Fallback: Interpolación densa en tramo directo
  return interpolarDenseCoordinates([
    { latitud: Number(origen.latitud), longitud: Number(origen.longitud) },
    { latitud: Number(destino.latitud), longitud: Number(destino.longitud) }
  ], 50); // 👈 Cambiado de 25 a 50
};

// src/services/ai.service.js
export const evaluarProximoLocalOptimo = (origenActual, localesPendientes) => {
  // Ordenar primero por mayor/menor sensibilidad de forma estricta, y en caso de empate, por distancia.
  return localesPendientes.sort((a, b) => {
    const sensA = Number(a.maxSensibilidad) || 1;
    const sensB = Number(b.maxSensibilidad) || 1;

    // Si difieren en sensibilidad, priorizar la menor o mayor según la regla del negocio
    if (sensB !== sensA) {
      return sensA - sensB; // O sensB - sensA según la jerarquía requerida
    }

    // Si tienen la misma sensibilidad, desempatar por distancia GPS al repartidor
    const distA = calcularDistanciaKM(origenActual.latitud, origenActual.longitud, Number(a.latitud), Number(a.longitud));
    const distB = calcularDistanciaKM(origenActual.latitud, origenActual.longitud, Number(b.latitud), Number(b.longitud));
    
    return distA - distB;
  })[0];
};
// 🧠 ORDENADOR INTELIGENTE POR SENSIBILIDAD Y RUTEO REAL SOBRE CALLES
export const generarEtapasRuta = async (repartidorUbicacion, locales, clienteUbicacion) => {
  const etapas = [];
  let puntoOrigenActual = { latitud: Number(repartidorUbicacion.latitud), longitud: Number(repartidorUbicacion.longitud) };
  let localesPendientes = [...locales];

  while (localesPendientes.length > 0) {
    const proximoLocal = evaluarProximoLocalOptimo(puntoOrigenActual, localesPendientes);
    const puntoDestino = { latitud: Number(proximoLocal.latitud), longitud: Number(proximoLocal.longitud) };
    
    // Obtener ruta sobre trazado vial
    const puntos = await obtenerRutaCallesOSRM(puntoOrigenActual, puntoDestino);

    etapas.push({
      tipo: 'hacia_local',
      localId: proximoLocal.id,
      localNombre: proximoLocal.nombre,
      maxSensibilidad: proximoLocal.maxSensibilidad,
      retirado: Boolean(proximoLocal.retirado),
      puntos: puntos.slice(1)
    });

    puntoOrigenActual = puntoDestino;
    localesPendientes = localesPendientes.filter(l => l.id !== proximoLocal.id);
  }

  // Tramo final hacia la dirección del cliente
  const puntoCliente = { latitud: Number(clienteUbicacion.latitud), longitud: Number(clienteUbicacion.longitud) };
  const puntosCliente = await obtenerRutaCallesOSRM(puntoOrigenActual, puntoCliente);

  etapas.push({
    tipo: 'hacia_cliente',
    puntos: puntosCliente.slice(1)
  });

  return etapas;
};
