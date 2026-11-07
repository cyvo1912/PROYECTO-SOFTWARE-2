const responderError = require('../responderError');

class NotificacionController {
  constructor(servicioNotificacion) {
    if (!servicioNotificacion) {
      throw new Error('servicioNotificacion es requerido');
    }

    this.servicioNotificacion = servicioNotificacion;
  }

  async registrarToken(req, res) {
    try {
      const data = await this.servicioNotificacion.registrarToken(
        req.user,
        req.body.token,
        req.body.plataforma,
      );

      return res.status(200).json({
        success: true,
        message: 'Token registrado correctamente.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  async listar(req, res) {
    try {
      const data = await this.servicioNotificacion.listarNotificaciones(
        req.user,
      );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  async marcarComoLeida(req, res) {
    try {
      const data = await this.servicioNotificacion.marcarComoLeida(
        req.user,
        req.params.id,
      );

      return res.status(200).json({
        success: true,
        message: 'Notificación marcada como leída.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = NotificacionController;