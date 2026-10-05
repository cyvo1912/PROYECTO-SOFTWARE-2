/**
 * Entidad de Dominio: Hijo
 * Perfil de un niño asociado a una familia (Padre).
 */
class Hijo {
  constructor({ id, idPadre, nombre, edad, alergias, condicionesMedicas, notas }) {
    this.id = id;
    this.idPadre = idPadre;
    this.nombre = nombre;
    this.edad = edad;
    this.alergias = alergias || null;
    this.condicionesMedicas = condicionesMedicas || null;
    this.notas = notas || null;
  }

  perteneceA(idPadre) {
    return Number(this.idPadre) === Number(idPadre);
  }
}

module.exports = Hijo;
