const responderError = require('../responderError');

/**
 * Adaptador Primario: BolsaTrabajoController (GRASP Controlador) - HU14
 * Recibe las peticiones HTTP de la bolsa de trabajo, delega al
 * ServicioBolsaTrabajo y formatea la respuesta JSON.
 */
class BolsaTrabajoController {
  constructor(servicioBolsaTrabajo) {
    if (!servicioBolsaTrabajo) {
      throw new Error('servicioBolsaTrabajo es requerido en BolsaTrabajoController');
    }
    this.servicioBolsaTrabajo = servicioBolsaTrabajo;
  }

  /**
   * GET /api/ofertas?q=&distrito=&tarifaMin=&soloCompatibles=true
   */
  async explorar(req, res) {
    try {
      const { q, distrito, tarifaMin, soloCompatibles } = req.query;
      const data = await this.servicioBolsaTrabajo.explorarOfertas(req.user, {
        q,
        distrito,
        tarifaMin,
        soloCompatibles,
      });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * GET /api/ofertas/:id
   */
  async obtener(req, res) {
    try {
      const data = await this.servicioBolsaTrabajo.obtenerOferta(req.user, req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * POST /api/ofertas/:id/postulaciones
   */
  async postular(req, res) {
    try {
      const data = await this.servicioBolsaTrabajo.postular(req.user, req.params.id, {
        mensaje: req.body?.mensaje,
      });
      return res.status(201).json({
        success: true,
        message: 'Te postulaste correctamente. La familia revisará tu perfil.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * GET /api/ofertas/mis-postulaciones
   */
  async misPostulaciones(req, res) {
    try {
      const data = await this.servicioBolsaTrabajo.listarMisPostulaciones(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * POST /api/ofertas
   */
  async publicar(req, res) {
    try {
      const data = await this.servicioBolsaTrabajo.publicarOferta(req.user, req.body || {});
      return res.status(201).json({
        success: true,
        message: 'Oferta publicada correctamente en la bolsa de trabajo.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * GET /api/ofertas/mis-ofertas
   */
  async misOfertas(req, res) {
    try {
      const data = await this.servicioBolsaTrabajo.listarMisOfertas(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = BolsaTrabajoController;
