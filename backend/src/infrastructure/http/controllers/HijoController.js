/**
 * Adaptador Primario: HijoController (Controlador HTTP Express)
 * Gestiona los perfiles de los hijos de la familia autenticada.
 * Delega la lógica de negocio a ServicioHijo.
 */
class HijoController {
  constructor(servicioHijo) {
    if (!servicioHijo) throw new Error('servicioHijo es requerido en HijoController');
    this.servicioHijo = servicioHijo;
  }

  /** GET /api/hijos */
  async listar(req, res) {
    try {
      const hijos = await this.servicioHijo.listarHijos(req.user.id);
      return res.status(200).json({
        success: true,
        data: hijos,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /** POST /api/hijos */
  async registrar(req, res) {
    try {
      const hijo = await this.servicioHijo.registrarHijo(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Perfil del niño registrado correctamente.',
        data: hijo,
      });
    } catch (error) {
      return this._responderError(res, error);
    }
  }

  /** PUT /api/hijos/:id */
  async actualizar(req, res) {
    try {
      const hijo = await this.servicioHijo.actualizarHijo(req.user.id, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Perfil del niño actualizado correctamente.',
        data: hijo,
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

module.exports = HijoController;
