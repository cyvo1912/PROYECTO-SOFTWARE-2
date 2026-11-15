const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../../domain/errors/DomainErrors');

/**
 * Servicio de aplicación de valoraciones (HU18).
 * Centraliza las reglas para que tanto HTTP como las pruebas usen el mismo caso de uso.
 */
class ServicioValoracion {
  constructor({ reservaRepository, valoracionRepository }) {
    if (!reservaRepository || !valoracionRepository) {
      throw new Error('reservaRepository y valoracionRepository son requeridos');
    }
    this.reservaRepository = reservaRepository;
    this.valoracionRepository = valoracionRepository;
  }

  async crear(usuario, datos = {}) {
    this._exigirFamiliaAutenticada(usuario);

    const { idReserva, calificacion, comentario } = this._normalizarDatosCreacion(datos);
    const reserva = await this.reservaRepository.buscarPorId(idReserva);

    if (!reserva) {
      throw new NotFoundError('La reserva no existe.');
    }
    if (Number(reserva.idPadre) !== Number(usuario.id)) {
      throw new ForbiddenError('Solo puedes valorar tus propias reservas.');
    }
    if (String(reserva.estadoReserva).toUpperCase() !== 'COMPLETADA') {
      throw new ValidationError('Solo puedes valorar servicios completados.', {
        idReserva: 'La reserva aún no está completada.',
      });
    }
    if (await this.valoracionRepository.existeParaReserva(idReserva)) {
      throw new ConflictError('Esta reserva ya fue valorada.');
    }

    const resultado = await this.valoracionRepository.crear({
      idReserva,
      idPadre: Number(usuario.id),
      idNinera: reserva.idNinera,
      calificacion,
      comentario,
    });

    // La restricción UNIQUE de la base de datos mantiene esta regla ante solicitudes simultáneas.
    if (!resultado) {
      throw new ConflictError('Esta reserva ya fue valorada.');
    }

    return resultado;
  }

  async listarPorNinera(idNinera) {
    const id = Number(idNinera);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador de la niñera no es válido.', {
        idNinera: 'Debe ser un número entero positivo.',
      });
    }
    return this.valoracionRepository.listarPorNinera(id);
  }

  async obtenerPorReserva(usuario, idReserva) {
    if (!usuario?.id || !usuario?.tipo_usuario) {
      throw new UnauthorizedError('Debes iniciar sesión para consultar una valoración.');
    }

    const id = Number(idReserva);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador de la reserva no es válido.', {
        idReserva: 'Debe ser un número entero positivo.',
      });
    }

    const resultado = await this.valoracionRepository.obtenerPorReserva(id);
    if (!resultado) {
      throw new NotFoundError('No existe una valoración para esta reserva.');
    }

    const idFamilia = resultado.idPadre ?? resultado.id_padre;
    if (usuario.tipo_usuario !== 'ADMIN' && Number(idFamilia) !== Number(usuario.id)) {
      throw new ForbiddenError('No puedes consultar esta valoración.');
    }

    return resultado;
  }

  _exigirFamiliaAutenticada(usuario) {
    if (!usuario?.id) {
      throw new UnauthorizedError('Debes iniciar sesión para dejar una valoración.');
    }
    if (usuario.tipo_usuario !== 'FAMILIA') {
      throw new ForbiddenError('Solo la familia que contrató el servicio puede valorar.');
    }
  }

  _normalizarDatosCreacion(datos) {
    const idReserva = Number(datos.idReserva);
    const calificacion = Number(datos.calificacion);
    const fields = {};

    if (
      datos.comentario !== undefined &&
      datos.comentario !== null &&
      typeof datos.comentario !== 'string'
    ) {
      fields.comentario = 'El comentario debe ser un texto.';
    }

    const comentario = typeof datos.comentario === 'string'
      ? datos.comentario.trim() || null
      : null;

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      fields.idReserva = 'Selecciona una reserva válida.';
    }
    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      fields.calificacion = 'Selecciona una calificación entre 1 y 5.';
    }
    if (comentario?.length > 1000) {
      fields.comentario = 'El comentario no puede superar 1000 caracteres.';
    }
    if (Object.keys(fields).length > 0) {
      throw new ValidationError('Revisa los datos de tu valoración.', fields);
    }

    return { idReserva, calificacion, comentario };
  }
}

module.exports = ServicioValoracion;
