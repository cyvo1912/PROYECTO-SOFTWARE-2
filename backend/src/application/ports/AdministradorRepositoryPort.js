/**
 * Puerto de salida para las operaciones de administración.
 * HU9: revisión y activación de cuentas de niñeras.
 */
class AdministradorRepositoryPort {
  async listarNinerasPendientes() {
    throw new Error('Método listarNinerasPendientes no implementado');
  }

  async obtenerNinera(idNinera) {
    throw new Error('Método obtenerNinera no implementado');
  }

  async actualizarEstadoCertificado(idCertificado, estado) {
    throw new Error('Método actualizarEstadoCertificado no implementado');
  }

  async activarNinera(idNinera) {
    throw new Error('Método activarNinera no implementado');
  }
}

module.exports = AdministradorRepositoryPort;