/**
 * Adaptador Primario: AuthController (Controlador HTTP Express)
 * Gestiona peticiones de entrada y delega la lógica de negocio a los
 * servicios de aplicación (ServicioAuth, ServicioRegistro)
 */
class AuthController {
  constructor(servicioAuth, servicioRegistro) {
    if (!servicioAuth) throw new Error('servicioAuth es requerido en AuthController');
    if (!servicioRegistro) throw new Error('servicioRegistro es requerido en AuthController');
    this.servicioAuth = servicioAuth;
    this.servicioRegistro = servicioRegistro;
  }

  async login(req, res) {
    const { email, password, role } = req.body;

    try {
      const resultado = await this.servicioAuth.iniciarSesion(email, password, role);

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token: resultado.token,
        user: resultado.usuario,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /** Registro de familia (mockup "Registro como Familia"): queda con sesión iniciada. */
  async registrarPadre(req, res) {
    try {
      const resultado = await this.servicioRegistro.registrarPadre(req.body);

      return res.status(201).json({
        success: true,
        message: 'Cuenta creada correctamente.',
        token: resultado.token,
        user: resultado.usuario,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /** Registro de niñera (mockup "Registro como Niñera"): queda pendiente de verificación (Restricción 13). */
  async registrarNinera(req, res) {
    try {
      const resultado = await this.servicioRegistro.registrarNinera(req.body);

      return res.status(201).json({
        success: true,
        message: 'Registro recibido. Un administrador revisará tus datos antes de activar tu cuenta.',
        user: resultado.usuario,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  _responderError(res, error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      isPending: error.isPending || false,
      message: error.message || 'Error interno del servidor.',
      fields: error.fields || undefined,
    });
  }
}

module.exports = AuthController;