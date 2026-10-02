/**
 * Puerto de Salida: Servicio de Hasheo de Contraseñas
 */
class PasswordHasherPort {
  async compare(plainPassword, hashedPassword) {
    throw new Error('Método compare no implementado');
  }

  async hash(plainPassword) {
    throw new Error('Método hash no implementado');
  }
}

module.exports = PasswordHasherPort;
