/**
 * Adaptador Primario: AuthController (Controlador HTTP Express)
 * Gestiona peticiones de entrada y delega la lógica de negocio a ServicioAuth
 */
class AuthController {
  constructor(servicioAuth) {
    if (!servicioAuth) throw new Error('servicioAuth es requerido en AuthController');
    this.servicioAuth = servicioAuth;
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
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        isPending: error.isPending || false,
        message: error.message || 'Error interno del servidor.',
      });
    }
  }
}

module.exports = AuthController;
