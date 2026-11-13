/**
 * Puerto de Salida: Repositorio de la Bolsa de Trabajo (HU14)
 */
class OfertaTrabajoRepositoryPort {
  async obtenerPerfilNinera(idNinera) {
    throw new Error('Método obtenerPerfilNinera no implementado');
  }

  async listarAbiertas(filtros) {
    throw new Error('Método listarAbiertas no implementado');
  }

  async findById(idOferta) {
    throw new Error('Método findById no implementado');
  }

  async crearOferta(idPadre, datosOferta) {
    throw new Error('Método crearOferta no implementado');
  }

  async listarPorPadre(idPadre) {
    throw new Error('Método listarPorPadre no implementado');
  }

  async listarIdsOfertasPostuladas(idNinera) {
    throw new Error('Método listarIdsOfertasPostuladas no implementado');
  }

  async crearPostulacion(idOferta, idNinera, mensaje) {
    throw new Error('Método crearPostulacion no implementado');
  }

  async listarPostulacionesPorNinera(idNinera) {
    throw new Error('Método listarPostulacionesPorNinera no implementado');
  }
}

module.exports = OfertaTrabajoRepositoryPort;
