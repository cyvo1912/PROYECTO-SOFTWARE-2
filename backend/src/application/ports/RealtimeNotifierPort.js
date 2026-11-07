/**
 * Puerto de Salida: Notificador en Tiempo Real (WebSockets / Socket.IO)
 * Arquitectura Hexagonal - Abstracción para transmisión reactiva de eventos al cliente.
 */
class RealtimeNotifierPort {
  /**
   * Notifica a un usuario específico la llegada de un nuevo mensaje.
   */
  emitirNuevoMensaje(idReceptor, mensaje) {
    throw new Error('Método emitirNuevoMensaje no implementado');
  }

  /**
   * Notifica a un usuario que sus mensajes enviados han sido leídos.
   */
  emitirMensajesLeidos(idEmisor, datosLectura) {
    throw new Error('Método emitirMensajesLeidos no implementado');
  }

  /**
   * Notifica a contactos o salas el estado de conexión del usuario ("En línea" / desconectado).
   */
  emitirEstadoUsuario(idUsuario, enLinea) {
    throw new Error('Método emitirEstadoUsuario no implementado');
  }
}

module.exports = RealtimeNotifierPort;
