class ReservaController {
  constructor(servicioReserva) {
    if (!servicioReserva) throw new Error('servicioReserva es requerido en ReservaController');
    this.servicioReserva = servicioReserva;
  }

  /** GET /api/reservas */
  async listar(req, res) {
    try {
      const reservas = await this.servicioReserva.listarReservas(req.user.id, req.user.tipo_usuario);
      return res.status(200).json({ success: true, data: reservas });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /** PATCH /api/reservas/:id/estado */
  async actualizarEstado(req, res) {
    try {
      const reserva = await this.servicioReserva.actualizarEstado(
        req.user.id,
        req.user.tipo_usuario,
        req.params.id,
        req.body.estado,
      );
      return res.status(200).json({
        success: true,
        message: 'Estado de la reserva actualizado.',
        data: reserva,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  _responderError(res, error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error interno del servidor.',
      fields: error.fields || undefined,
    });
  }
}

module.exports = ReservaController;
