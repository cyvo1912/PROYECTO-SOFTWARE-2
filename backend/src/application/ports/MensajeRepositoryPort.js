/**
 * Puerto de Salida: Repositorio de Mensajes
 * Arquitectura Hexagonal - Define el contrato de persistencia para mensajería interna.
 */
class MensajeRepositoryPort {
  /**
   * Guarda un nuevo mensaje en la base de datos.
   */
  async crearMensaje({ idEmisor, idReceptor, contenido }) {
    throw new Error('Método crearMensaje no implementado');
  }

  /**
   * Obtiene el historial de mensajes ordenado entre dos usuarios.
   */
  async obtenerMensajesEntreUsuarios(idUsuarioA, idUsuarioB, { limite = 50, offset = 0 } = {}) {
    throw new Error('Método obtenerMensajesEntreUsuarios no implementado');
  }

  /**
   * Obtiene el listado de conversaciones activas de un usuario con último mensaje y badge de no leídos.
   */
  async obtenerConversaciones(idUsuario) {
    throw new Error('Método obtenerConversaciones no implementado');
  }

  /**
   * Marca los mensajes recibidos de un emisor específico como leídos.
   */
  async marcarMensajesComoLeidos(idUsuarioReceptor, idUsuarioEmisor) {
    throw new Error('Método marcarMensajesComoLeidos no implementado');
  }

  /**
   * Cuenta total de mensajes no leídos para un usuario.
   */
  async contarMensajesNoLeidos(idUsuario) {
    throw new Error('Método contarMensajesNoLeidos no implementado');
  }

  /**
   * Verifica si existe una reserva confirmada o pagada entre el padre y la niñera.
   * Regla de negocio crítica: solo se puede conversar una vez pagada la tarifa / reserva confirmada.
   */
  async verificarReservaPagada(idUsuarioA, idUsuarioB) {
    throw new Error('Método verificarReservaPagada no implementado');
  }

  /**
   * Obtiene el perfil público/detallado de un contacto para el visor de perfil en chat.
   */
  async obtenerPerfilContacto(idContacto) {
    throw new Error('Método obtenerPerfilContacto no implementado');
  }
}

module.exports = MensajeRepositoryPort;
