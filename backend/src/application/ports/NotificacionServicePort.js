/**
 * Puerto de Salida: Servicio de Notificaciones
 * Arquitectura Hexagonal - Permite desacoplar el módulo de mensajería del módulo de notificaciones.
 * Figura 56 del documento de diseño.
 */
class NotificacionServicePort {
  /**
   * Crea un registro de notificación cuando llega un mensaje nuevo.
   */
  async crearNotificacionMensaje(idReceptor, idMensaje, texto) {
    throw new Error('Método crearNotificacionMensaje no implementado');
  }
}

module.exports = NotificacionServicePort;
