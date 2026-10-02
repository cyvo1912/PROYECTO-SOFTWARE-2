const bcrypt = require('bcryptjs');
const PasswordHasherPort = require('../../../application/ports/PasswordHasherPort');

/**
 * Adaptador Secundario: Hasher de contraseñas con bcryptjs
 * Implementa PasswordHasherPort
 */
class BcryptPasswordHasher extends PasswordHasherPort {
  async compare(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword) return false;
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async hash(plainPassword, saltRounds = 10) {
    return bcrypt.hash(plainPassword, saltRounds);
  }
}

module.exports = BcryptPasswordHasher;
