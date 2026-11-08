/**
 * Entidad de Dominio: Mensaje
 * Representa un mensaje individual entre dos usuarios (Padre y Niñera).
 * Arquitectura Hexagonal - Capa de Dominio (Pura, sin dependencias externas)
 */
class Mensaje {
  constructor({
    id,
    idUsuarioEmisor,
    idUsuarioReceptor,
    contenido,
    asunto = null,
    fechaCreacion = new Date(),
    leido = false,
    fechaLectura = null,
  }) {
    this.id = id;
    this.idUsuarioEmisor = Number(idUsuarioEmisor);
    this.idUsuarioReceptor = Number(idUsuarioReceptor);
    this.contenido = contenido ? String(contenido).trim() : '';
    this.asunto = asunto;
    this.fechaCreacion = fechaCreacion instanceof Date ? fechaCreacion : new Date(fechaCreacion);
    this.leido = Boolean(leido);
    this.fechaLectura = fechaLectura ? (fechaLectura instanceof Date ? fechaLectura : new Date(fechaLectura)) : null;
  }

  marcarLeido(fecha = new Date()) {
    this.leido = true;
    this.fechaLectura = fecha;
  }

  esEmisor(idUsuario) {
    return this.idUsuarioEmisor === Number(idUsuario);
  }

  esReceptor(idUsuario) {
    return this.idUsuarioReceptor === Number(idUsuario);
  }

  perteneceA(idUsuario) {
    const id = Number(idUsuario);
    return this.idUsuarioEmisor === id || this.idUsuarioReceptor === id;
  }
}

module.exports = Mensaje;
