const jwt = require('jsonwebtoken');
const TokenServicePort = require('../../../application/ports/TokenServicePort');

/**
 * Adaptador Secundario: Generador y verificador de JWT
 * Implementa TokenServicePort
 */
class JwtTokenService extends TokenServicePort {
  constructor(secret = process.env.JWT_SECRET || 'minana_jwt_secret_key_2026', expiresIn = '7d') {
    super();
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  generateToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verifyToken(token) {
    return jwt.verify(token, this.secret);
  }
}

module.exports = JwtTokenService;
