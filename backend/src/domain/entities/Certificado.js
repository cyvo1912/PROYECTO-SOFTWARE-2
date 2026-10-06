/**
 * Entidad de Dominio: Certificado (HU8)
 * Documento que respalda la formación o antecedentes de una niñera.
 * El administrador lo revisa en HU9 (estadoRevision).
 */
class Certificado {
  constructor({
    id,
    idNinera,
    tipo,
    nombre,
    institucion,
    fechaEmision,
    fechaVencimiento,
    archivoPublicId,
    archivoFormato,
    archivoTipoRecurso,
    estadoRevision,
    fechaSubida,
  }) {
    this.id = id;
    this.idNinera = idNinera;
    this.tipo = tipo;
    this.nombre = nombre;
    this.institucion = institucion;
    this.fechaEmision = fechaEmision;
    this.fechaVencimiento = fechaVencimiento || null;
    this.archivoPublicId = archivoPublicId;
    this.archivoFormato = archivoFormato;
    this.archivoTipoRecurso = archivoTipoRecurso;
    this.estadoRevision = estadoRevision || 'PENDIENTE'; // 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
    this.fechaSubida = fechaSubida;
  }

  perteneceA(idNinera) {
    return Number(this.idNinera) === Number(idNinera);
  }
}

module.exports = Certificado;
