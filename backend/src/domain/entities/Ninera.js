const Usuario = require('./Usuario');

/**
 * Entidad de Dominio: Niñera
 * Hereda de Usuario según el Diagrama de Clases UML y Arquitectura Hexagonal.
 * Encapsula la lógica de verificación y visibilidad pública (HU12).
 */
class Ninera extends Usuario {
  constructor(
    userData = {},
    {
      idNinera,
      zona,
      experiencia,
      tarifaHora,
      descripcion,
      anosExperiencia = null,
      habilidades = [],
      idiomas = [],
      distritos = [],
      verificada = false,
      fotoUrl = null,
    } = {},
  ) {
    super(userData);
    this.idNinera = idNinera || this.id;
    this.zona = zona || null;
    this.experiencia = experiencia || null;
    this.tarifaHora = tarifaHora !== undefined && tarifaHora !== null ? parseFloat(tarifaHora) : 0.0;
    this.descripcion = descripcion || null;
    this.biografia = this.descripcion;
    this.anosExperiencia = anosExperiencia !== null && anosExperiencia !== undefined ? Number(anosExperiencia) : null;
    this.aniosExperiencia = this.anosExperiencia;
    this.habilidades = Array.isArray(habilidades) ? habilidades : [];
    this.idiomas = Array.isArray(idiomas) ? idiomas : [];
    this.distritos = Array.isArray(distritos) ? distritos : [];
    this.verificada = Boolean(verificada);
    this.fotoUrl = fotoUrl || userData.fotoUrl || null;
  }

  estaVerificada() {
    return this.verificada === true;
  }

  /**
   * Regla de negocio de Visibilidad (HU12):
   * La familia solo ve niñeras verificadas y con cuenta ACTIVA.
   * La propia niñera siempre puede ver su perfil como vista previa.
   */
  esVisiblePara(usuario) {
    const esLaMismaNinera = Boolean(usuario) && Number(usuario.id) === Number(this.idNinera || this.id);
    const esPublica = this.verificada && this.estaActivo();
    return esPublica || esLaMismaNinera;
  }
}

module.exports = Ninera;
