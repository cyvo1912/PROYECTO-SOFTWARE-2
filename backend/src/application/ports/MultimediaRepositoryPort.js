class MultimediaRepositoryPort {
  async obtenerFoto(idUsuario) {
    throw new Error('Método obtenerFoto no implementado');
  }

  async guardarFoto(idUsuario, { url, publicId }) {
    throw new Error('Método guardarFoto no implementado');
  }

  async contarCertificados(idNinera) {
    throw new Error('Método contarCertificados no implementado');
  }

  async listarCertificados(idNinera) {
    throw new Error('Método listarCertificados no implementado');
  }

  async crearCertificado(datosCertificado) {
    throw new Error('Método crearCertificado no implementado');
  }

  async buscarCertificado(idCertificado) {
    throw new Error('Método buscarCertificado no implementado');
  }

  async eliminarCertificado(idCertificado) {
    throw new Error('Método eliminarCertificado no implementado');
  }
}

module.exports = MultimediaRepositoryPort;
