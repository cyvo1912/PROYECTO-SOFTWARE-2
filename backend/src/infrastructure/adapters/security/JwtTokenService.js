const jwt = require('jsonwebtoken');
const TokenServicePort = require('../../../application/ports/TokenServicePort');

/**
 * Adaptador Secundario: Generador y verificador de JWT (RFC 7519 Standard Claims)
 * Implementa TokenServicePort (SOLID: Interface Segregation / Dependency Inversion)
 */
class JwtTokenService extends TokenServicePort {
  constructor(
    secret = process.env.JWT_SECRET || 'minana_jwt_secret_key_2026',
    expiresIn = '7d'
  ) {
    super();
    this.secret = secret;
    this.expiresIn = expiresIn;
    this.blacklistedTokens = new Set();
  }

  /**
   * Genera un token JWT estándar RFC 7519 con claims oficiales:
   * sub (subject: id), email, role, jti (jwt token id)
   */
  generateToken(payload) {
    const userId = payload.id || payload.sub;
    const userEmail = payload.correo || payload.email;
    const userRole = payload.tipo_usuario || payload.tipoUsuario || payload.role;

    const claims = {
      sub: userId,
      id: userId,
      email: userEmail,
      correo: userEmail,
      role: userRole,
      tipo_usuario: userRole,
      jti: `t_${userId}_${Date.now()}`,
    };

    return jwt.sign(claims, this.secret, { expiresIn: this.expiresIn });
  }

  /**
   * Verifica la validez y firma del token JWT, comprobando la lista de revocación.
   */
  verifyToken(token) {
    if (this.isTokenInvalidated(token)) {
      const error = new Error('Token revocado por cierre de sesión.');
      error.name = 'JsonWebTokenError';
      throw error;
    }
    const decoded = jwt.verify(token, this.secret);
    // Normalización de propiedades para compatibilidad de middlewares
    decoded.id = decoded.sub || decoded.id;
    decoded.tipo_usuario = decoded.role || decoded.tipo_usuario;
    decoded.correo = decoded.email || decoded.correo;
    return decoded;
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
