/**
 * Entidad de Dominio: OfertaTrabajo (HU14 - Bolsa de Trabajo)
 * Oferta de servicio de cuidado publicada por una familia.
 */
class OfertaTrabajo {
  constructor({
    id,
    idPadre,
    nombreFamilia,
    titulo,
    descripcion,
    distrito,
    fechaInicio,
    horaInicio,
    horaFin,
    tarifaHora,
    numeroNinos,
    edadesNinos,
    requisitos,
    estado,
    fechaPublicacion,
    totalPostulaciones,
  }) {
    this.id = id;
    this.idPadre = idPadre;
    this.nombreFamilia = nombreFamilia || null;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.distrito = distrito;
    this.fechaInicio = fechaInicio;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.tarifaHora = tarifaHora !== undefined && tarifaHora !== null ? Number(tarifaHora) : null;
    this.numeroNinos = numeroNinos !== undefined && numeroNinos !== null ? Number(numeroNinos) : 1;
    this.edadesNinos = edadesNinos || null;
    this.requisitos = requisitos || null;
    this.estado = estado || 'ABIERTA';
    this.fechaPublicacion = fechaPublicacion || null;
    this.totalPostulaciones = Number(totalPostulaciones || 0);
  }

  estaAbierta() {
    return this.estado === 'ABIERTA';
  }
}

module.exports = OfertaTrabajo;
