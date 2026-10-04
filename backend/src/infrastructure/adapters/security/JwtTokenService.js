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
    this.blacklistedTokens = new Set();
  }

  generateToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verifyToken(token) {
    if (this.isTokenInvalidated(token)) {
      const error = new Error('Token revocado por cierre de sesión.');
      error.name = 'JsonWebTokenError';
      throw error;
    }
    return jwt.verify(token, this.secret);
  }

  invalidateToken(token) {
    if (token) {
      this.blacklistedTokens.add(token);
    }
    return true;
  }

  isTokenInvalidated(token) {
    if (!token) return true;
    return this.blacklistedTokens.has(token);
  }
}

module.exports = JwtTokenService;
