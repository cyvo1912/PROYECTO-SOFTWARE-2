const {
  ValidationError,
  NotFoundError,
} = require('../../domain/errors/DomainErrors');

class ServicioNotificacion {
  constructor({ notificacionRepository, expoNotificationAdapter }) {
    if (!notificacionRepository || !expoNotificationAdapter) {
      throw new Error('Las dependencias de notificaciones son requeridas');
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
      !/^ExponentPushToken\[.+\]$/.test(token)
    ) {
      throw new ValidationError('El token de Expo no es válido.');
    }

    return this.notificacionRepository.registrarToken(
      usuario.id,
      token,
      plataforma || 'desconocida',
    );
  }

  async listarNotificaciones(usuario) {
    if (!usuario || !usuario.id) {
      throw new ValidationError('Usuario no autenticado.');
    }

    return this.notificacionRepository.listarPorUsuario(usuario.id);
  }

  async marcarComoLeida(usuario, idNotificacion) {
    const id = Number(idNotificacion);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador no es válido.');
    }

    const resultado = await this.notificacionRepository.marcarComoLeida(
      id,
      usuario.id,
    );

    if (!resultado) {
      throw new NotFoundError('Notificación no encontrada.');
    }

    return resultado;
  }

  async enviarNotificacion({ idUsuario, idReserva, titulo, mensaje, tipo }) {
    if (!idUsuario || !titulo || !mensaje || !tipo) {
      throw new ValidationError('Faltan datos de la notificación.');
    }

    const notificacion = await this.notificacionRepository.crearNotificacion({
      idUsuario,
      idReserva: idReserva || null,
      titulo,
      mensaje,
      tipo,
    });

    const tokens = await this.notificacionRepository.obtenerTokensActivos(
      idUsuario,
    );

    if (tokens.length > 0) {
      await this.expoNotificationAdapter.enviar(tokens, {
        title: titulo,
        body: mensaje,
        data: {
          tipo,
          idReserva: idReserva || null,
          idNotificacion: notificacion.id_notificacion,
        },
      });
    }

    return notificacion;
  }
}

module.exports = ServicioNotificacion;