/**
 * Entidad de Dominio: Postulacion (HU14 - Bolsa de Trabajo)
 * Registro de una niñera que se postula a una oferta de trabajo.
 */
class Postulacion {
  constructor({ id, idOferta, idNinera, mensaje, estado, fechaPostulacion, oferta }) {
    this.id = id;
    this.idOferta = idOferta;
    this.idNinera = idNinera;
    this.mensaje = mensaje || null;
    this.estado = estado || 'PENDIENTE';
    this.fechaPostulacion = fechaPostulacion || null;
    // Resumen opcional de la oferta (para "Mis postulaciones")
    this.oferta = oferta || null;
  }
}

module.exports = Postulacion;
