const Usuario = require('./Usuario');

/**
 * Entidad de Dominio: Padre (Familia)
 * Hereda de Usuario según el Diagrama de Clases UML
 */
class Padre extends Usuario {
  constructor(userData, { idPadre, nombreFamilia, direccion, numeroNinos, edadesNinos, informacionAdicional } = {}) {
    super(userData);
    this.idPadre = idPadre || this.id;
    this.nombreFamilia = nombreFamilia || this.nombre;
    this.direccion = direccion || null;
    this.numeroNinos = numeroNinos || 0;
    this.edadesNinos = edadesNinos || [];
    this.informacionAdicional = informacionAdicional || null;
  }
}

module.exports = Padre;
