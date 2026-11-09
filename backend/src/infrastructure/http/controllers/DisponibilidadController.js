const responderError = require('../responderError');

/**
 * Adaptador Primario: DisponibilidadController (GRASP Controlador)
 * Recibe la petición HTTP de consulta de disponibilidad de una niñera,
 * delega al ServicioDisponibilidad y formatea la respuesta JSON.
 */
class DisponibilidadController {
  constructor(servicioDisponibilidad) {
    if (!servicioDisponibilidad) {
      throw new Error('servicioDisponibilidad es requerido en DisponibilidadController');
    }
    this.servicioDisponibilidad = servicioDisponibilidad;
  }

  /**
   * GET /api/nineras
   */
  async listarNineras(req, res) {
    try {
      const data = await this.servicioDisponibilidad.listarNinerasDisponibles(req.user);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * GET /api/nineras/:idNinera/disponibilidad?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
   */
  async consultarPorNinera(req, res) {
    try {
      const { idNinera } = req.params;
      const { desde, hasta } = req.query;

      const data = await this.servicioDisponibilidad.consultarDisponibilidad(
        req.user,
        idNinera,
        { desde, hasta },
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

module.exports = DisponibilidadController;

