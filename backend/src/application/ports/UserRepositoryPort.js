class UserRepositoryPort {
  async findByEmail(email) {
    throw new Error('Método findByEmail no implementado');
  }
 
  async findByDni(dni) {
    throw new Error('Método findByDni no implementado');
  }
 
  async findPadreDetails(idUsuario) {
    throw new Error('Método findPadreDetails no implementado');
  }
 
  async findNineraDetails(idUsuario) {
    throw new Error('Método findNineraDetails no implementado');
  }

  async findById(idUsuario) {
    throw new Error('Método findById no implementado');
  }

  async crearPadre(datosUsuario, datosPadre) {
    throw new Error('Método crearPadre no implementado');
  }

  async crearNinera(datosUsuario, datosNinera) {
    throw new Error('Método crearNinera no implementado');
  }

  async actualizarPerfilNinera(idUsuario, datosUsuario, datosNinera) {
    throw new Error('Método actualizarPerfilNinera no implementado');
  }

  async actualizarPerfilPadre(idUsuario, datosUsuario, datosPadre) {
    throw new Error('Método actualizarPerfilPadre no implementado');
  }

  /**
   * HU11: actualiza únicamente las coordenadas de la niñera (botón
   * "Actualizar mi ubicación" en su panel, capturadas con el GPS del celular).
   */
  async actualizarUbicacionNinera(idUsuario, latitud, longitud) {
    throw new Error('Método actualizarUbicacionNinera no implementado');
  }

  /**
   * HU11: busca niñeras ACTIVAS y verificadas dentro de un radio (km) a
   * partir de la ubicación de la familia, opcionalmente filtrando por
   * tarifa máxima y años de experiencia mínimos. Debe devolver los
   * resultados ordenados por distancia ascendente.
   */
  async buscarNinerasCercanas(filtros) {
    throw new Error('Método buscarNinerasCercanas no implementado');
  }
}

module.exports = UserRepositoryPort;