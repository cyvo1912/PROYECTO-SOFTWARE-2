/**
 * Middleware de Autenticación y Autorización (SOLID: Dependency Inversion)
 * Verifica el token JWT emitido por TokenService y valida roles y revocación.
 */
function crearAuthMiddleware(tokenService, userRepository = null) {
  const autenticar = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Se requiere un token válido.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = tokenService.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message:
          error.name === 'TokenExpiredError'
            ? 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
            : 'Token inválido o sesión cerrada.',
      });
    }

    try {
      // El JWT identifica la sesión, pero el estado de cuenta se consulta en
      // la fuente de verdad para que una suspensión sea efectiva al instante.
      if (userRepository) {
        const usuario = await userRepository.findById(decoded.id);
        if (!usuario || usuario.tipoUsuario !== decoded.tipo_usuario) {
          return res.status(401).json({ success: false, message: 'La sesión ya no es válida.' });
        }
        if (usuario.estadoCuenta === 'SUSPENDIDA' || usuario.estadoCuenta === 'INACTIVA') {
          return res.status(403).json({ success: false, message: 'Tu cuenta se encuentra inactiva o suspendida.' });
        }
        decoded.accesoLimitado = usuario.estadoCuenta === 'PENDIENTE_VERIFICACION';
      }
      if (decoded.accesoLimitado && !req.baseUrl.startsWith('/api/multimedia')) {
        return res.status(403).json({
          success: false,
          message: 'Tu expediente está pendiente de revisión. Solo puedes completar foto y certificados hasta que un administrador active tu cuenta.',
        });
      }
      req.user = decoded;
      req.token = token;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  const soloNinera = (req, res, next) => {
    if (!req.user || req.user.tipo_usuario !== 'NINERA') {
      return res.status(403).json({
        success: false,
        message:
          'Acceso restringido: Solo niñeras autorizadas pueden realizar esta operación.',
      });
    }
    return next();
  };

  const soloFamilia = (req, res, next) => {
    if (!req.user || req.user.tipo_usuario !== 'FAMILIA') {
      return res.status(403).json({
        success: false,
        message:
          'Acceso restringido: Solo familias pueden realizar esta operación.',
      });
    }
    return next();
  };

  const soloAdmin = (req, res, next) => {
    if (!req.user || req.user.tipo_usuario !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message:
          'Acceso restringido: solo administradores pueden realizar esta operación.',
      });
    }

    return next();
  };

  return {
    autenticar,
    soloNinera,
    soloFamilia,
    soloAdmin,
  };
}

module.exports = crearAuthMiddleware;
