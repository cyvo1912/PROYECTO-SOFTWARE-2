/**
 * Adaptador Primario: UsuarioController (Controlador HTTP Express)
 * Gestiona endpoints relacionados con el perfil de usuario y niñera (HU5).
 * Delega la lógica de negocio a ServicioUsuario.
 */
class UsuarioController {
  constructor(servicioUsuario) {
    if (!servicioUsuario) throw new Error('servicioUsuario es requerido en UsuarioController');
    this.servicioUsuario = servicioUsuario;
  }

  /**
   * GET /api/usuarios/perfil/ninera
   * Obtiene los datos del perfil actual de la niñera autenticada.
   */
  async obtenerPerfilNinera(req, res) {
    try {
      const idUsuario = req.user.id;
      const perfil = await this.servicioUsuario.obtenerPerfilNinera(idUsuario);

      return res.status(200).json({
        success: true,
        data: perfil,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /**
   * PUT /api/usuarios/perfil/ninera
   * Actualiza el perfil profesional de la niñera autenticada (HU5).
   */
  async actualizarPerfilNinera(req, res) {
    try {
      const idUsuarioAutenticado = req.user.id;
      const idObjetivo = req.body.id ? req.body.id : idUsuarioAutenticado;

      const perfilActualizado = await this.servicioUsuario.actualizarPerfilNinera(
        idUsuarioAutenticado,
        idObjetivo,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: 'Perfil profesional actualizado exitosamente.',
        user: perfilActualizado,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /**
   * GET /api/usuarios/perfil/padre
   * Obtiene los datos del perfil actual de la familia autenticada.
   */
  async obtenerPerfilPadre(req, res) {
    try {
      const idUsuario = req.user.id;
      const perfil = await this.servicioUsuario.obtenerPerfilPadre(idUsuario);

      return res.status(200).json({
        success: true,
        data: perfil,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /**
   * PUT /api/usuarios/perfil/padre
   * Actualiza el perfil del hogar / familia autenticada.
   */
  async actualizarPerfilPadre(req, res) {
    try {
      const idUsuarioAutenticado = req.user.id;
      const idObjetivo = req.body.id ? req.body.id : idUsuarioAutenticado;

      const perfilActualizado = await this.servicioUsuario.actualizarPerfilPadre(
        idUsuarioAutenticado,
        idObjetivo,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: 'Perfil de familia actualizado exitosamente.',
        user: perfilActualizado,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  _responderError(res, error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Error interno del servidor.',
      fields: error.fields || undefined,
    });
  }
}

module.exports = UsuarioController;
