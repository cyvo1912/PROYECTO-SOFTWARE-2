
const {
  ValidationError,
  NotFoundError,
} = require('../../domain/errors/DomainErrors');

class ServicioNotificacion {
  constructor({ notificacionRepository, expoNotificationAdapter }) {
    if (!notificacionRepository || !expoNotificationAdapter) {
      throw new Error(
        'Las dependencias de notificaciones son requeridas'
      );
    }

    this.notificacionRepository = notificacionRepository;
    this.expoNotificationAdapter = expoNotificationAdapter;
  }

  async registrarToken(usuario, token, plataforma) {
    if (!usuario || !usuario.id) {
      throw new ValidationError('Usuario no autenticado.');
    }

    if (
      typeof token !== 'string' ||
      !/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token)
    ) {
      throw new ValidationError('El token de Expo no es válido.');
    }

    return this.notificacionRepository.registrarToken(
      usuario.id,
      token,
      plataforma || 'desconocida'
    );
  }

  async listarNotificaciones(usuario) {
    if (!usuario || !usuario.id) {
      throw new ValidationError('Usuario no autenticado.');
    }

    return this.notificacionRepository.listarPorUsuario(
      usuario.id
    );
  }

  async marcarComoLeida(usuario, idNotificacion) {
    if (!usuario || !usuario.id) {
      throw new ValidationError('Usuario no autenticado.');
    }

    const id = Number(idNotificacion);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(
        'El identificador no es válido.'
      );
    }

    const resultado =
      await this.notificacionRepository.marcarComoLeida(
        id,
        usuario.id
      );

    if (!resultado) {
      throw new NotFoundError(
        'Notificación no encontrada.'
      );
    }

    return resultado;
  }

  async enviarNotificacion({
    idUsuario,
    idReserva,
    titulo,
    mensaje,
    tipo,
  }) {
    const usuarioId = Number(idUsuario);

    if (
      !Number.isInteger(usuarioId) ||
      usuarioId <= 0 ||
      typeof titulo !== 'string' ||
      !titulo.trim() ||
      typeof mensaje !== 'string' ||
      !mensaje.trim() ||
      typeof tipo !== 'string' ||
      !tipo.trim()
    ) {
      throw new ValidationError(
        'Faltan datos válidos de la notificación.'
      );
    }

    let reservaId = null;

    if (idReserva !== null && idReserva !== undefined) {
      reservaId = Number(idReserva);

      if (!Number.isInteger(reservaId) || reservaId <= 0) {
        throw new ValidationError(
          'El identificador de reserva no es válido.'
        );
      }
    }

    const notificacion =
      await this.notificacionRepository.crearNotificacion({
        idUsuario: usuarioId,
        idReserva: reservaId,
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        tipo: tipo.trim(),
      });

    try {
      const tokens =
        await this.notificacionRepository.obtenerTokensActivos(
          usuarioId
        );

      if (tokens.length > 0) {
        await this.expoNotificationAdapter.enviar(tokens, {
          title: titulo,
          body: mensaje,
          data: {
            tipo,
            idReserva: reservaId,
            idNotificacion: notificacion.id_notificacion,
          },
        });
      }
    } catch (error) {
      console.error(
        'La notificación se guardó, pero falló el envío push:',
        error
      );
    }

    return notificacion;
  }
}

module.exports = ServicioNotificacion;
