// 📐 Calcular distancia en kilómetros entre dos coordenadas GPS (Haversine)
export const calcularDistanciaKM = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
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

// 📍 Interpola N puntos intermedios en línea recta entre dos coordenadas GPS
export const interpolarCoordenadas = (puntoA, puntoB, pasos = 4) => {
  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const factor = i / pasos;
    const lat = puntoA.latitud + (puntoB.latitud - puntoA.latitud) * factor;
    const lng = puntoA.longitud + (puntoB.longitud - puntoA.longitud) * factor;
    puntos.push({
      latitud: Number(lat.toFixed(8)),
      longitud: Number(lng.toFixed(8))
    });
  }
  return puntos;
};

// 🧠 ORDENADOR INTELIGENTE POR NIVEL DE SENSIBILIDAD
export const evaluarProximoLocalOptimo = (posicionActual, localesRestantes) => {
  if (localesRestantes.length === 1) return localesRestantes[0];

  let mejorLocal = null;
  let menorScore = Infinity;

  for (const local of localesRestantes) {
    const distancia = calcularDistanciaKM(
      posicionActual.latitud,
      posicionActual.longitud,
      local.latitud,
      local.longitud
    );

    const tiempoEsperaEst = local.estaListo ? 0 : (local.tiempoPreparacionMin || 10);

    // 🌡️ PENALIZACIÓN DINÁMICA SEGÚN NIVEL DE SENSIBILIDAD (1 a 4)
    // Nivel 1: Normal/Ambiente -> Penalización 0
    // Nivel 2: Caliente         -> Penalización 10
    // Nivel 3: Frito            -> Penalización 25
    // Nivel 4: Frío/Helado      -> Penalización 50
    let penaltySensibilidad = 0;
    const nivelSensibilidad = Number(local.maxSensibilidad) || 1;

    // Solo penaliza si aún quedan otros locales pendientes por visitar
    const hayOtrosLocalesPendientes = localesRestantes.some(l => l.id !== local.id);

    if (hayOtrosLocalesPendientes) {
      if (nivelSensibilidad === 2) penaltySensibilidad = 10;
      else if (nivelSensibilidad === 3) penaltySensibilidad = 25;
      else if (nivelSensibilidad >= 4) penaltySensibilidad = 50;
    }

    // Score: A menor puntaje, más prioritario es para visitar ahora mismo
    const score = (distancia * 1.5) + (tiempoEsperaEst * 2.0) + penaltySensibilidad;

    if (score < menorScore) {
      menorScore = score;
      mejorLocal = local;
    }
  }

  return mejorLocal;
};

// 🛣️ Genera la ruta con evaluación paso a paso
export const generarEtapasRuta = (repartidorUbicacion, locales, clienteUbicacion) => {
  const etapas = [];
  let puntoOrigenActual = { latitud: Number(repartidorUbicacion.latitud), longitud: Number(repartidorUbicacion.longitud) };
  let localesPendientes = [...locales];

  while (localesPendientes.length > 0) {
    const proximoLocal = evaluarProximoLocalOptimo(puntoOrigenActual, localesPendientes);
    
    const puntoDestino = { latitud: Number(proximoLocal.latitud), longitud: Number(proximoLocal.longitud) };
    const puntos = interpolarCoordenadas(puntoOrigenActual, puntoDestino, 4);

    etapas.push({
      tipo: 'hacia_local',
      localId: proximoLocal.id,
      localNombre: proximoLocal.nombre,
      maxSensibilidad: proximoLocal.maxSensibilidad,
      puntos: puntos.slice(1)
    });

    puntoOrigenActual = puntoDestino;
    localesPendientes = localesPendientes.filter(l => l.id !== proximoLocal.id);
  }

  // Tramo final hacia el cliente
  const puntoCliente = { latitud: Number(clienteUbicacion.latitud), longitud: Number(clienteUbicacion.longitud) };
  const puntosCliente = interpolarCoordenadas(puntoOrigenActual, puntoCliente, 5);

  etapas.push({
    tipo: 'hacia_cliente',
    puntos: puntosCliente.slice(1)
  });

  return etapas;
};