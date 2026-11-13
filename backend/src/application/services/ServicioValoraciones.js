const { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../../domain/errors/DomainErrors');

/** HU18: una familia valora una sola vez una reserva completada. */
class ServicioValoraciones {
  constructor({ reservaRepository, valoracionRepository }) {
    if (!reservaRepository || !valoracionRepository) throw new Error('Se requieren repositorios de reserva y valoración');
    this.reservaRepository = reservaRepository;
    this.valoracionRepository = valoracionRepository;
  }

  async crear(usuario, datos = {}) {
    if (!usuario?.id) throw new UnauthorizedError('Debes iniciar sesión para dejar una valoración.');
    if (usuario.tipo_usuario !== 'FAMILIA') throw new ForbiddenError('Solo la familia que contrató el servicio puede valorar.');
    const idReserva = Number(datos.idReserva);
    const calificacion = Number(datos.calificacion);
    const comentario = datos.comentario ? String(datos.comentario).trim() : null;
    const fields = {};
    if (!Number.isInteger(idReserva) || idReserva <= 0) fields.idReserva = 'Selecciona una reserva válida.';
    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) fields.calificacion = 'Selecciona una calificación entre 1 y 5.';
    if (comentario && comentario.length > 1000) fields.comentario = 'El comentario no puede superar 1000 caracteres.';
    if (Object.keys(fields).length) throw new ValidationError('Revisa los datos de tu valoración.', fields);

    const reserva = await this.reservaRepository.buscarPorId(idReserva);
    if (!reserva) throw new NotFoundError('La reserva no existe.');
    if (Number(reserva.idPadre) !== Number(usuario.id)) throw new ForbiddenError('Solo puedes valorar tus propias reservas.');
    if (String(reserva.estadoReserva).toUpperCase() !== 'COMPLETADA') {
      throw new ValidationError('Solo puedes valorar servicios completados.', { idReserva: 'La reserva aún no está completada.' });
    }
    if (await this.valoracionRepository.existeParaReserva(idReserva)) throw new ConflictError('Esta reserva ya fue valorada.');
    return this.valoracionRepository.crear({ idReserva, idPadre: Number(usuario.id), idNinera: reserva.idNinera, calificacion, comentario });
  }

  async listarPorNinera(idNinera) {
    const id = Number(idNinera);
    if (!Number.isInteger(id) || id <= 0) throw new NotFoundError('La niñera no existe.');
    return this.valoracionRepository.listarPorNinera(id);
  }
}

module.exports = ServicioValoraciones;
