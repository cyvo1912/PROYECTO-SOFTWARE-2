/**
 * Entidad de Dominio: Reserva
 * GRASP (Experto en Información): conoce su horario, su duración
 * y si choca con otra reserva.
 */
class Reserva {
  constructor({
    id = null,
    idPadre,
    idNinera,
    idHijo = null,
    fechaReserva,
    horaInicio,
    horaFin,
    direccion,
    comentario = null,
    estadoReserva = 'Pendiente',
    tarifaHora = null,
    horas = null,
    montoTotal = null,
    fechaCreacion = null,
    expiraEn = null,
  }) {
    this.id = id;
    this.idPadre = idPadre;
    this.idNinera = idNinera;
    this.idHijo = idHijo;
    this.fechaReserva = fechaReserva; // 'YYYY-MM-DD'
    this.horaInicio = normalizarHora(horaInicio); // 'HH:MM'
    this.horaFin = normalizarHora(horaFin);
    this.direccion = direccion;
    this.comentario = comentario;
    this.estadoReserva = estadoReserva || 'Pendiente';
    this.tarifaHora = tarifaHora;
    this.horas = horas;
    this.montoTotal = montoTotal;
    this.fechaCreacion = fechaCreacion;
    this.expiraEn = expiraEn ? new Date(expiraEn) : null; // fin de los 10 min para pagar
  }

  estaPendiente() {
    return String(this.estadoReserva || 'pendiente').toLowerCase() === 'pendiente';
  }

  /** Pendiente y sin pagar después de su plazo: ya no separa el horario. */
  estaExpirada(ahora = new Date()) {
    return this.estaPendiente() && this.expiraEn !== null && this.expiraEn <= ahora;
  }

  /** Duración de la reserva en minutos. */
  duracionEnMinutos() {
    return aMinutos(this.horaFin) - aMinutos(this.horaInicio);
  }

  /** Cancelada, rechazada o vencida sin pagar: ya no ocupa el horario. */
  estaActiva(ahora = new Date()) {
    const estado = String(this.estadoReserva || 'pendiente').toLowerCase();
    if (estado === 'cancelada' || estado === 'rechazada') return false;
    return !this.estaExpirada(ahora);
  }

  /**
   * La familia puede cancelar únicamente antes de la última hora previa al inicio.
   * La fecha y hora de la reserva se interpretan siempre en la zona de Lima.
   */
  puedeCancelarse(ahora = new Date()) {
    const inicio = new Date(`${this.fechaReserva}T${this.horaInicio}:00-05:00`);
    return Number.isFinite(inicio.getTime()) && ahora.getTime() < inicio.getTime() - (60 * 60 * 1000);
  }

  /**
   * Dos rangos [A, B) y [C, D) se solapan si A < D y C < B.
   * Que una termine justo cuando empieza la otra (12:00 y 12:00) NO es solape.
   */
  seSolapaCon(otra) {
    if (this.fechaReserva !== otra.fechaReserva) return false;
    const inicioA = aMinutos(this.horaInicio);
    const finA = aMinutos(this.horaFin);
    const inicioB = aMinutos(normalizarHora(otra.horaInicio));
    const finB = aMinutos(normalizarHora(otra.horaFin));
    return inicioA < finB && inicioB < finA;
  }
}

/** '08:00:00' -> '08:00' */
function normalizarHora(valor) {
  if (typeof valor !== 'string') return '';
  return valor.trim().slice(0, 5);
}

/** '08:30' -> 510 */
function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

module.exports = Reserva;
