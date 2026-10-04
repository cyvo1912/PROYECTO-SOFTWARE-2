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
}

module.exports = UserRepositoryPort;