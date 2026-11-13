const responderError = require('../responderError');

class ValoracionController {
  constructor(servicioValoraciones) { this.servicioValoraciones = servicioValoraciones; }
  async crear(req, res) {
    try { return res.status(201).json({ success: true, data: await this.servicioValoraciones.crear(req.user, req.body) }); }
    catch (error) { return responderError(res, error); }
  }
  async listarPorNinera(req, res) {
    try { return res.status(200).json({ success: true, data: await this.servicioValoraciones.listarPorNinera(req.params.idNinera) }); }
    catch (error) { return responderError(res, error); }
  }
}

module.exports = ValoracionController;
