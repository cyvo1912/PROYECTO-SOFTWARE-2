const responderError = require('../responderError');

/**
 * Adaptador Primario: ReservaController (GRASP Controlador)
 */
class ReservaController {
  async solicitarRango(req, res) {
    try { return res.status(201).json({ success: true, data: await this.servicioReserva.solicitarRango(req.user, req.body || {}) }); }
    catch (error) { return responderError(res, error); }
  }
  async cancelarFechas(req, res) {
    try { return res.status(200).json({ success: true, data: await this.servicioReserva.cancelarFechas(req.user, req.params.grupo, req.body?.fechas) }); }
    catch (error) { return responderError(res, error); }
  }
  async solicitarDesdePostulacion(req, res) {
    try {
      const data = await this.servicioReserva.solicitarDesdePostulacion(req.user, req.params.id, req.params.postulacionId, req.body || {});
      return res.status(201).json({ success: true, data });
    } catch (error) { return responderError(res, error); }
  }
  constructor(servicioReserva) {
    if (!servicioReserva) throw new Error('servicioReserva es requerido en ReservaController');
    this.servicioReserva = servicioReserva;
  }

  /** POST /api/reservas/cotizar */
  async cotizar(req, res) {
    try {
      const data = await this.servicioReserva.cotizar(req.user, req.body);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** POST /api/reservas */
  async solicitar(req, res) {
    try {
      const data = await this.servicioReserva.solicitar(req.user, req.body);
      return res.status(201).json({
        success: true,
        message: 'Horario separado por 10 minutos. Completa el pago para enviarlo a aceptación de la niñera.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** GET /api/reservas */
  async listarMias(req, res) {
    try {
      const data = await this.servicioReserva.listarMisReservas(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** PATCH /api/reservas/:id/estado */
  async cambiarEstado(req, res) {
    try {
      const data = await this.servicioReserva.cambiarEstado(req.user, req.params.id, req.body?.estado);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** POST /api/reservas/:id/pagar - Simulación de pasarela de pago */
  async pagar(req, res) {
    try {
      const data = await this.servicioReserva.pagar(req.user, req.params.id, req.body || {});
      return res.status(200).json({
        success: true,
        message: 'Pago registrado. Ya puedes comunicarte por el chat.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = ReservaController;
