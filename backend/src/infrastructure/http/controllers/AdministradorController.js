const responderError = require('../responderError');

class AdministradorController {
  constructor(servicioAdministrador) {
    if (!servicioAdministrador) {
      throw new Error(
        'servicioAdministrador es requerido en AdministradorController',
      );
    }

    this.servicioAdministrador = servicioAdministrador;
  }

  async listarNinerasPendientes(req, res) {
    try {
      const data =
        await this.servicioAdministrador.listarNinerasPendientes(
          req.user,
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('❌ ERROR HU9 - listarNinerasPendientes:');
      console.error(error);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);

      return responderError(res, error);
    }
  }

  async obtenerNinera(req, res) {
    try {
      const data =
        await this.servicioAdministrador.obtenerNinera(
          req.user,
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

  async aprobarCertificado(req, res) {
    try {
      const data =
        await this.servicioAdministrador.aprobarCertificado(
          req.user,
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message: 'Certificado aprobado correctamente.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  async rechazarCertificado(req, res) {
    try {
      const data =
        await this.servicioAdministrador.rechazarCertificado(
          req.user,
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message: 'Certificado rechazado correctamente.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  async activarNinera(req, res) {
    try {
      const data =
        await this.servicioAdministrador.activarNinera(
          req.user,
          req.params.id,
        );

      return res.status(200).json({
        success: true,
        message: 'Cuenta de niñera activada correctamente.',
        data,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = AdministradorController;