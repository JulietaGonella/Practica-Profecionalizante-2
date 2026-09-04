// src/utils/horarios.js

export const estaLocalAbierto = (local, horarios = []) => {
  if (!local) return false;

  const estaActivoAdministrativamente = local.es_activo ?? local.activo ?? local.esActivo;
  const estaOperativo = local.esta_operativo ?? local.estaOperativo ?? true;

  if (Number(estaActivoAdministrativamente) !== 1 || Number(estaOperativo) !== 1) {
    return false;
  }

  const listaHorarios = horarios.length > 0 ? horarios : (local.horarios || []);
  if (!listaHorarios || listaHorarios.length === 0) {
    return false;
  }

  const ahora = new Date();
  const diaSemanaActual = ahora.getDay(); // 0 = Domingo, ..., 6 = Sábado

  // 🟢 1. Filtrar TODOS los turnos activos del día de hoy (soporta doble turno)
  const turnosHoy = listaHorarios.filter(
    (h) => Number(h.dia_semana ?? h.diaSemana) === diaSemanaActual && 
           (h.es_activo === true || Number(h.es_activo) === 1)
  );

  if (turnosHoy.length === 0) {
    return false;
  }

  const aMinutos = (horaStr) => {
    if (!horaStr || typeof horaStr !== 'string') return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  // 🟢 2. Verificar si la hora actual cae en CUALQUIERA de los turnos de hoy
  return turnosHoy.some((horario) => {
    const minutosApertura = aMinutos(horario.hora_apertura || horario.apertura);
    const minutosCierre = aMinutos(horario.hora_cierre || horario.cierre);

    // Cruce de medianoche (ej: 20:00 a 02:00)
    if (minutosCierre < minutosApertura) {
      return minutosActuales >= minutosApertura || minutosActuales <= minutosCierre;
    }

    // Horario normal
    return minutosActuales >= minutosApertura && minutosActuales <= minutosCierre;
  });
};

export const obtenerResumenHorarios = (horarios = []) => {
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diasInactivos = [];

  DIAS.forEach((nombreDia, idx) => {
    const turnosDelDia = horarios.filter((h) => Number(h.dia_semana ?? h.diaSemana) === idx && (h.es_activo === true || Number(h.es_activo) === 1));
    if (turnosDelDia.length === 0) {
      diasInactivos.push(nombreDia);
    }
  });

  return {
    diasInactivos,
    tieneDiasInactivos: diasInactivos.length > 0
  };
};