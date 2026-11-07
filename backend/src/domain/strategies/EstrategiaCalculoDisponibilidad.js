/**
 * Patrón Strategy (GoF) + SOLID (OCP / DIP):
 * Define el contrato para proyectar y filtrar los bloques de disponibilidad
 * de una niñera dentro de un rango de fechas consultado en el calendario.
 */
class EstrategiaCalculoDisponibilidad {
  /**
   * @param {Object} params
   * @param {Array<import('../entities/Disponibilidad')>} params.bloquesDisponibilidad
   * @param {Array<{fechaReserva: string, horaInicio: string, horaFin: string, estadoReserva: string}>} params.reservasActivas
   * @param {string} params.fechaDesde - 'YYYY-MM-DD'
   * @param {string} params.fechaHasta - 'YYYY-MM-DD'
   * @returns {Object.<string, Array<{idDisponibilidad: number, horaInicio: string, horaFin: string, disponible: boolean, estado: string}>>}
   */
  resolverHorariosPorRango(_params) {
    throw new Error('Método resolverHorariosPorRango no implementado');
  }
}

const DIAS_SEMANA_UTC = [
  'DOMINGO',
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

/**
 * Estrategia concreta: combina disponibilidad por fecha puntual (`fecha`)
 * y por día de la semana (`dia_semana`), descartando o marcando bloques
 * ocupados por reservas activas en el rango `[fechaDesde, fechaHasta]`.
 */
class EstrategiaDisponibilidadRangoFechas extends EstrategiaCalculoDisponibilidad {
  resolverHorariosPorRango({
    bloquesDisponibilidad = [],
    reservasActivas = [],
    fechaDesde,
    fechaHasta,
  }) {
    const agendaPorFecha = {};
    const fechasEnRango = generarFechasEnRango(fechaDesde, fechaHasta);

    const bloquesActivos = bloquesDisponibilidad.filter((b) => b.estaDisponible());

    for (const fechaISO of fechasEnRango) {
      const diaSemanaActual = obtenerNombreDiaSemana(fechaISO);

      // Filtrar bloques que aplican a esta fecha exacta o al día de la semana
      const bloquesDelDia = bloquesActivos.filter((bloque) => {
        if (bloque.fecha) {
          return bloque.fecha === fechaISO;
        }
        if (bloque.diaSemana) {
          return normalizarTextoDia(bloque.diaSemana) === diaSemanaActual;
        }
        return false;
      });

      if (bloquesDelDia.length === 0) continue;

      const reservasDelDia = reservasActivas.filter(
        (r) => r.fechaReserva === fechaISO,
      );

      const slotsCalculados = [];

      for (const bloque of bloquesDelDia) {
        const estaReservado = reservasDelDia.some((reserva) =>
          bloque.seSolapaCon(reserva.horaInicio, reserva.horaFin),
        );

        if (!estaReservado) {
          slotsCalculados.push({
            idDisponibilidad: bloque.id,
            horaInicio: bloque.horaInicio,
            horaFin: bloque.horaFin,
            estado: 'Disponible',
            disponible: true,
          });
        }
      }

      if (slotsCalculados.length > 0) {
        // Ordenar cronológicamente y evitar duplicados exactos de rango
        slotsCalculados.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        agendaPorFecha[fechaISO] = deduplicarSlots(slotsCalculados);
      }
    }

    return agendaPorFecha;
  }
}

function generarFechasEnRango(fechaDesde, fechaHasta) {
  const fechas = [];
  const cursor = new Date(`${fechaDesde}T00:00:00.000Z`);
  const fin = new Date(`${fechaHasta}T00:00:00.000Z`);

  while (cursor <= fin) {
    fechas.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return fechas;
}

function obtenerNombreDiaSemana(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00.000Z`);
  return DIAS_SEMANA_UTC[fecha.getUTCDay()];
}

function normalizarTextoDia(dia) {
  return String(dia)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function deduplicarSlots(slots) {
  const vistos = new Set();
  return slots.filter((slot) => {
    const clave = `${slot.horaInicio}-${slot.horaFin}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

module.exports = {
  EstrategiaCalculoDisponibilidad,
  EstrategiaDisponibilidadRangoFechas,
};

