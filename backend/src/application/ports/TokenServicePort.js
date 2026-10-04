/**
 * Puerto de Salida: Servicio de Tokens (JWT)
 */
class TokenServicePort {
  generateToken(payload) {
    throw new Error('Método generateToken no implementado');
  }

  verifyToken(token) {
    throw new Error('Método verifyToken no implementado');
  }

  invalidateToken(token) {
    throw new Error('Método invalidateToken no implementado');
  }

  isTokenInvalidated(token) {
    throw new Error('Método isTokenInvalidated no implementado');
  }
}

module.exports = TokenServicePort;
