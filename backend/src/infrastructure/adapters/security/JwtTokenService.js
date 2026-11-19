const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const TokenServicePort = require('../../../application/ports/TokenServicePort');

// Valores de ejemplo que nunca deben usarse como secreto real.
const SECRETOS_INSEGUROS = new Set(['tu_clave_secreta_jwt', 'minana_jwt_secret_key_2026']);

/**
 * Obtiene JWT_SECRET del entorno. Si falta o es un valor de ejemplo, el servidor no arranca:
 * firmar con un secreto conocido permitiría falsificar tokens de cualquier usuario.
 * En pruebas (NODE_ENV=test) se usa un secreto aleatorio por proceso.
 */
function resolverSecreto(env = process.env) {
  const secreto = String(env.JWT_SECRET || '').trim();
  if (secreto && !SECRETOS_INSEGUROS.has(secreto)) return secreto;
  if (env.NODE_ENV === 'test') return crypto.randomBytes(32).toString('hex');
  throw new Error(
    'JWT_SECRET no está definido o usa un valor de ejemplo. Configúralo en backend/.env antes de iniciar el servidor.'
  );
}

function huellaToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Adaptador Secundario: Generador y verificador de JWT (RFC 7519 Standard Claims)
 * Implementa TokenServicePort (SOLID: Interface Segregation / Dependency Inversion)
 *
 * Revocación (logout): se mantiene en memoria para que verifyToken siga siendo síncrono y,
 * si se inyecta un repositorio, también se persiste en BD y se recarga al iniciar el servidor,
 * de modo que un token cerrado no vuelva a ser válido tras un reinicio.
 */
class JwtTokenService extends TokenServicePort {
  constructor(secret, expiresIn = '7d', revocacionRepository = null) {
    super();
    this.secret = secret || resolverSecreto();
    this.expiresIn = expiresIn;
    this.revocacionRepository = revocacionRepository;
    this.blacklistedTokens = new Set(); // huellas SHA-256 de tokens revocados
  }

  /**
   * Carga desde BD las revocaciones aún vigentes y elimina las ya expiradas.
   */
  async cargarRevocados() {
    if (!this.revocacionRepository) return 0;
    await this.revocacionRepository.eliminarExpirados();
    const huellas = await this.revocacionRepository.listarVigentes();
    huellas.forEach((h) => this.blacklistedTokens.add(h));
    return huellas.length;
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
      accesoLimitado: payload.accesoLimitado === true,
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

  /**
   * Revoca un token. Devuelve una promesa que se resuelve cuando la revocación quedó persistida.
   */
  async invalidateToken(token) {
    if (!token) return true;

    // /auth/logout no exige sesión: solo se registran tokens firmados por este servidor y
    // aún vigentes. Un texto cualquiera o un token expirado ya es rechazado por verifyToken,
    // así que guardarlo solo permitiría llenar la memoria o la BD con basura.
    let decoded;
    try {
      decoded = jwt.verify(token, this.secret);
    } catch {
      return false;
    }

    const huella = huellaToken(token);
    this.blacklistedTokens.add(huella);

    if (this.revocacionRepository) {
      await this.revocacionRepository.guardar(huella, new Date(decoded.exp * 1000));
    }
    return true;
  }

  isTokenInvalidated(token) {
    if (!token) return true;
    return this.blacklistedTokens.has(huellaToken(token));
  }
}

JwtTokenService.resolverSecreto = resolverSecreto;
module.exports = JwtTokenService;
