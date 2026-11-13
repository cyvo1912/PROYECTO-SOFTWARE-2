/**
 * Puerto de Salida: Repositorio de Reservas
 */
class ReservaRepositoryPort {
  async listarPorUsuario(idUsuario, rol) {
    throw new Error('Método listarPorUsuario no implementado');
  }

  async findById(idReserva) {
    throw new Error('Método findById no implementado');
  }

  async actualizarEstado(idReserva, idUsuario, rol, estado, estadosActuales) {
    throw new Error('Método actualizarEstado no implementado');
  }
}

module.exports = ReservaRepositoryPort;
