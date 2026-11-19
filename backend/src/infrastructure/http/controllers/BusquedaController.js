const responderError = require('../responderError');

/**
 * Adaptador Primario: BusquedaController (Controlador HTTP Express)
 * HU11: endpoint de búsqueda de niñeras por proximidad, tarifa y experiencia.
 * Delega la lógica de negocio a ServicioBusqueda.
 */
class BusquedaController {
  constructor(servicioBusqueda) {
    if (!servicioBusqueda) throw new Error('servicioBusqueda es requerido en BusquedaController');
    this.servicioBusqueda = servicioBusqueda;
  }

  /**
   * GET /api/busqueda/ninera?latitud=&longitud=&radioKm=&tarifaMaxima=&experienciaMinima=
   * Solo accesible para familias autenticadas (middleware soloFamilia).
   */
  async buscarNineras(req, res) {
    try {
      const { latitud, longitud, radioKm, tarifaMaxima, experienciaMinima, desde, hasta, modo, horaInicio, horaFin } = req.query;

      const resultado = await this.servicioBusqueda.buscarNineras(req.user, {
        latitud,
        longitud,
        radioKm,
        tarifaMaxima,
        experienciaMinima,
        desde, hasta, modo, horaInicio, horaFin,
      });

      return res.status(200).json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = BusquedaController;
