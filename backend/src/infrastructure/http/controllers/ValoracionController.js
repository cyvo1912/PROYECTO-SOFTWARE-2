const responderError = require('../responderError');

class ValoracionController {
  constructor(servicioValoracion) {
    if (!servicioValoracion) {
      throw new Error('servicioValoracion es requerido');
    }

    this.servicioValoracion = servicioValoracion;
  }

  async crear(req, res) {
    try {
      const data = await this.servicioValoracion.crear(
        req.user,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: 'Valoración registrada correctamente.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  async listarPorNinera(req, res) {
    try {
      const data = await this.servicioValoracion.listarPorNinera(
        req.params.id,
      );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }
  async obtenerPorReserva(req, res) {
    try {
      const data = await this.servicioValoracion.obtenerPorReserva(
        req.user,
        req.params.id
      );

      return res.status(200).json({
        success: true,
        data,
      });

    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = ValoracionController;
