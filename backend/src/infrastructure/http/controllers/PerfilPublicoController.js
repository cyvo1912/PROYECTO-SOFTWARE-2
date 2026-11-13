const responderError = require('../responderError');

/**
 * Adaptador Primario: PerfilPublicoController (HU12)
 * Solo traduce HTTP <-> servicio. La lógica de negocio está en ServicioPerfilPublico.
 */
class PerfilPublicoController {
  constructor(servicioPerfilPublico) {
    if (!servicioPerfilPublico) throw new Error('servicioPerfilPublico es requerido en PerfilPublicoController');
    this.servicioPerfilPublico = servicioPerfilPublico;
  }

  /** GET /api/perfil-publico/:idNinera  (familia ve el perfil de una niñera) */
  async ver(req, res) {
    try {
      const data = await this.servicioPerfilPublico.verPerfilPublico(req.user, req.params.idNinera);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** GET /api/perfil-publico/mio  (niñera carga su formulario) */
  async obtenerMio(req, res) {
    try {
      const data = await this.servicioPerfilPublico.obtenerMiPerfilPublico(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** PUT /api/perfil-publico/mio  (niñera guarda su formulario) */
  async actualizarMio(req, res) {
    try {
      const data = await this.servicioPerfilPublico.actualizarMiPerfilPublico(req.user, req.body || {});
      return res.status(200).json({ success: true, message: 'Perfil público actualizado.', data });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = PerfilPublicoController;
