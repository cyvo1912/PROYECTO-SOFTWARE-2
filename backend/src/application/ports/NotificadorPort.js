/**
 * Puerto de salida para entregar notificaciones internas y push.
 * Los casos de uso no dependen de PostgreSQL, Expo ni Socket.IO.
 */
class NotificadorPort {
  async enviarNotificacion(datos) {
    throw new Error('Método enviarNotificacion no implementado');
  }
}

module.exports = NotificadorPort;
