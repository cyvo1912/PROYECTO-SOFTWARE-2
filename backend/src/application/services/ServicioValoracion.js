const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} = require('../../domain/errors/DomainErrors');

class ServicioValoracion {
  constructor({ valoracionRepository }) {
    if (!valoracionRepository) {
      throw new Error('valoracionRepository es requerido');
    }

    this.valoracionRepository = valoracionRepository;
  }

  async crear(usuario, datos) {
    if (!usuario || usuario.tipo_usuario !== 'FAMILIA') {
      throw new ForbiddenError('Solo las familias pueden registrar valoraciones.');
    }

    const idReserva = Number(datos.idReserva);
    const calificacion = Number(datos.calificacion);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      throw new ValidationError('El identificador de la reserva no es válido.');
    }

    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      throw new ValidationError('La calificación debe estar entre 1 y 5.');
    }

    if (
      datos.comentario !== undefined &&
      datos.comentario !== null &&
      typeof datos.comentario !== 'string'
    ) {
      throw new ValidationError('El comentario debe ser un texto.');
    }

    const resultado = await this.valoracionRepository.crear({
      idReserva,
      idPadre: usuario.id,
      calificacion,
      comentario: datos.comentario ? datos.comentario.trim() : null,
    });

    if (!resultado) {
      throw new NotFoundError(
        'La reserva no existe, no está finalizada, no te pertenece o ya fue valorada.',
      );
    }

    return resultado;
  }

  async listarPorNinera(idNinera) {
    const id = Number(idNinera);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador de la niñera no es válido.');
    }

    return this.valoracionRepository.listarPorNinera(id);
  }

  async obtenerPorReserva(usuario, idReserva) {
    const id = Number(idReserva);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador de la reserva no es válido.');
    }

    const resultado = await this.valoracionRepository.obtenerPorReserva(id);

    if (!resultado) {
      throw new NotFoundError('No existe una valoración para esta reserva.');
    }

    if (
      usuario.tipo_usuario !== 'ADMIN' &&
      Number(resultado.id_padre) !== Number(usuario.id)
    ) {
      throw new ForbiddenError('No puedes consultar esta valoración.');
    }

    return resultado;
  }
}

module.exports = ServicioValoracion;