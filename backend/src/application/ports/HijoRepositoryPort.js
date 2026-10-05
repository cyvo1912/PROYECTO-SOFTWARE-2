/**
 * Puerto de Salida: Repositorio de Hijos
 */
class HijoRepositoryPort {
  async listarPorPadre(idPadre) {
    throw new Error('Método listarPorPadre no implementado');
  }

  async findById(idHijo) {
    throw new Error('Método findById no implementado');
  }

  async crear(idPadre, datosHijo) {
    throw new Error('Método crear no implementado');
  }

  async actualizar(idHijo, datosHijo) {
    throw new Error('Método actualizar no implementado');
  }
}

module.exports = HijoRepositoryPort;
