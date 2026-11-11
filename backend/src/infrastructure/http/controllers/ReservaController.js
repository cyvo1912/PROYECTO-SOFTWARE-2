const responderError = require('../responderError');

/**
 * Adaptador Primario: ReservaController (GRASP Controlador)
 */
class ReservaController {
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
        message: 'Horario separado por 10 minutos. Completa el pago para confirmarlo.',
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
}

module.exports = ReservaController;
