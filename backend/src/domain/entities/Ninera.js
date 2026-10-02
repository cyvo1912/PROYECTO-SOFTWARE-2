const Usuario = require('./Usuario');

/**
 * Entidad de Dominio: Niñera
 * Hereda de Usuario según el Diagrama de Clases UML
 */
class Ninera extends Usuario {
  constructor(userData, { idNinera, zona, experiencia, tarifaHora, descripcion } = {}) {
    super(userData);
    this.idNinera = idNinera || this.id;
    this.zona = zona || null;
    this.experiencia = experiencia || null;
    this.tarifaHora = tarifaHora ? parseFloat(tarifaHora) : 0.0;
    this.descripcion = descripcion || null;
  }
}

module.exports = Ninera;
