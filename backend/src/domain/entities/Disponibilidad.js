/**
 * Entidad de Dominio: Disponibilidad
 * Aplicando GRASP (Experto en Información) y SOLID (SRP):
 * Encapsula las reglas de un bloque horario de disponibilidad de una niñera.
 */
class Disponibilidad {
  constructor({
    id,
    idNinera,
    fecha = null,
    diaSemana = null,
    horaInicio,
    horaFin,
    estado = 'Disponible',
  }) {
    this.id = id;
    this.idNinera = idNinera;
    this.fecha = fecha; // Formato 'YYYY-MM-DD' o null si es recurrente
    this.diaSemana = diaSemana ? diaSemana.toUpperCase().trim() : null;
    this.horaInicio = normalizarHora(horaInicio);
    this.horaFin = normalizarHora(horaFin);
    this.estado = estado || 'Disponible';
  }

  /**
   * Determina si el bloque se encuentra habilitado para atención.
   */
  estaDisponible() {
    return this.estado.toLowerCase() === 'disponible' && this.horaInicio < this.horaFin;
  }

  /**
   * Experto en Información (GRASP): evalúa si este bloque horario se solapa
   * con otro rango [otraHoraInicio, otraHoraFin] expresado en 'HH:MM'.
   */
  seSolapaCon(otraHoraInicio, otraHoraFin) {
    const inicioA = this.horaInicio;
    const finA = this.horaFin;
    const inicioB = normalizarHora(otraHoraInicio);
    const finB = normalizarHora(otraHoraFin);

    return inicioA < finB && inicioB < finA;
  }
}

/**
 * Normaliza cadenas TIME de PostgreSQL ('08:00:00' -> '08:00').
 */
function normalizarHora(valor) {
  if (typeof valor !== 'string') return '';
  return valor.trim().slice(0, 5);
}

module.exports = Disponibilidad;

