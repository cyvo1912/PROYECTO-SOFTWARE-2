/**
 * Puerto de Salida: Repositorio de Usuarios
 * Define el contrato que debe satisfacer cualquier adaptador de base de datos
 */
class UserRepositoryPort {
  async findByEmail(email) {
    throw new Error('Método findByEmail no implementado');
  }

  async findPadreDetails(idUsuario) {
    throw new Error('Método findPadreDetails no implementado');
  }

  async findNineraDetails(idUsuario) {
    throw new Error('Método findNineraDetails no implementado');
  }
}

module.exports = UserRepositoryPort;
