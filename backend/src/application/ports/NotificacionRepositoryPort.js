class NotificacionRepositoryPort {
  async registrarToken(idUsuario, token, plataforma) {
    throw new Error('Método registrarToken no implementado');
  }

  async listarPorUsuario(idUsuario) {
    throw new Error('Método listarPorUsuario no implementado');
  }

  async marcarComoLeida(idNotificacion, idUsuario) {
    throw new Error('Método marcarComoLeida no implementado');
  }

  async crearNotificacion(datos) {
    throw new Error('Método crearNotificacion no implementado');
  }

  async obtenerTokensActivos(idUsuario) {
    throw new Error('Método obtenerTokensActivos no implementado');
  }
}

module.exports = NotificacionRepositoryPort;