const {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require('../../domain/errors/DomainErrors');

const ROLES = new Set(['FAMILIA', 'NINERA']);
const ESTADOS = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

class ServicioReserva {
  constructor({ reservaRepository }) {
    if (!reservaRepository) throw new Error('reservaRepository es requerido en ServicioReserva');
    this.reservaRepository = reservaRepository;
  }

  async listarReservas(idUsuario, rol) {
    this._validarUsuario(idUsuario, rol);
    return this.reservaRepository.listarPorUsuario(idUsuario, rol);
  }

  async actualizarEstado(idUsuario, rol, idReserva, estado) {
    this._validarUsuario(idUsuario, rol);

    const id = Number(idReserva);
    if (!Number.isInteger(id) || id <= 0) {
      throw new NotFoundError('Reserva no encontrada.');
    }

    const estadoSolicitado = normalizarEstadoPermitido(estado);
    if (!estadoSolicitado) {
      throw new ValidationError('El estado solicitado no es válido.', {
        estado: 'Selecciona aceptar, rechazar o cancelar la reserva.',
      });
    }

    const reserva = await this.reservaRepository.findById(id);
    if (!reserva) throw new NotFoundError('Reserva no encontrada.');

    const esFamiliaPropietaria = rol === 'FAMILIA' && String(reserva.idPadre) === String(idUsuario);
    const esNineraPropietaria = rol === 'NINERA' && String(reserva.idNinera) === String(idUsuario);
    if (!esFamiliaPropietaria && !esNineraPropietaria) {
      throw new ForbiddenError('No tienes permiso para modificar esta reserva.');
    }

    const estadoActualGuardado = String(reserva.estado || '').trim().toLowerCase();
    const estadoActual = normalizarEstado(estadoActualGuardado);
    const transicionPermitida = rol === 'NINERA'
      ? estadoActual === ESTADOS.PENDIENTE.toLowerCase()
        ? [ESTADOS.ACEPTADA, ESTADOS.RECHAZADA].includes(estadoSolicitado)
        : estadoActual === ESTADOS.ACEPTADA.toLowerCase() && estadoSolicitado === ESTADOS.CANCELADA
      : estadoSolicitado === ESTADOS.CANCELADA
        && [ESTADOS.PENDIENTE.toLowerCase(), ESTADOS.ACEPTADA.toLowerCase()].includes(estadoActual);

    if (!transicionPermitida) {
      throw new ValidationError('No se puede realizar ese cambio de estado para la reserva.', {
        estado: 'La reserva ya no admite esta acción.',
      });
    }

    const actualizada = await this.reservaRepository.actualizarEstado(
      id,
      idUsuario,
      rol,
      estadoSolicitado,
      [estadoActualGuardado],
    );
    if (!actualizada) {
      throw new ValidationError('La reserva cambió mientras se procesaba la solicitud.', {
        estado: 'Actualiza el historial e inténtalo nuevamente.',
      });
    }

    return actualizada;
  }

  _validarUsuario(idUsuario, rol) {
    if (!idUsuario) throw new UnauthorizedError('Debes iniciar sesión para consultar tus reservas.');
    if (!ROLES.has(rol)) throw new ForbiddenError('Solo familias y niñeras pueden gestionar reservas.');
  }
}

function normalizarEstadoPermitido(estado) {
  if (typeof estado !== 'string') return null;
  const normalizado = estado.trim().toLowerCase();
  if (normalizado === 'aceptada' || normalizado === 'aceptar') return ESTADOS.ACEPTADA;
  if (normalizado === 'rechazada' || normalizado === 'rechazar') return ESTADOS.RECHAZADA;
  if (normalizado === 'cancelada' || normalizado === 'cancelar') return ESTADOS.CANCELADA;
  return null;
}

function normalizarEstado(estado) {
  if (typeof estado !== 'string') return '';
  const normalizado = estado.trim().toLowerCase();
  return normalizado === 'confirmada' ? ESTADOS.ACEPTADA.toLowerCase() : normalizado;
}

module.exports = ServicioReserva;
