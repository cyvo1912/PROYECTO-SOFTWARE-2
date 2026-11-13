const OfertaTrabajoRepositoryPort = require('../../../application/ports/OfertaTrabajoRepositoryPort');
const OfertaTrabajo = require('../../../domain/entities/OfertaTrabajo');
const Postulacion = require('../../../domain/entities/Postulacion');
const { ConflictError } = require('../../../domain/errors/DomainErrors');

// Fechas y horas se devuelven como texto para evitar desfases de zona horaria
const COLUMNAS_OFERTA = `
  o.id_oferta, o.id_padre, p.nombre_familia, o.titulo, o.descripcion, o.distrito,
  to_char(o.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
  to_char(o.hora_inicio, 'HH24:MI') AS hora_inicio,
  to_char(o.hora_fin, 'HH24:MI') AS hora_fin,
  o.tarifa_hora, o.numero_ninos, o.edades_ninos, o.requisitos, o.estado,
  o.fecha_publicacion,
  (SELECT COUNT(*) FROM postulacion ps WHERE ps.id_oferta = o.id_oferta) AS total_postulaciones
`;

/**
 * Adaptador Secundario: Repositorio de la Bolsa de Trabajo en PostgreSQL (Neon)
 * Implementa el puerto OfertaTrabajoRepositoryPort (HU14).
 */
class PostgresOfertaTrabajoRepository extends OfertaTrabajoRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async obtenerPerfilNinera(idNinera) {
    const result = await this.pool.query(
      `SELECT id_ninera, zona, distritos, tarifa_hora FROM ninera WHERE id_ninera = $1 LIMIT 1;`,
      [idNinera],
    );
    if (result.rows.length === 0) return null;
    const fila = result.rows[0];
    return {
      idNinera: fila.id_ninera,
      zona: fila.zona || null,
      distritos: Array.isArray(fila.distritos) ? fila.distritos : [],
      tarifaHora: fila.tarifa_hora !== null ? Number(fila.tarifa_hora) : null,
    };
  }

  async listarAbiertas({ q, distrito, tarifaMin, desdeFecha } = {}) {
    const condiciones = [`o.estado = 'ABIERTA'`];
    const valores = [];

    if (desdeFecha) {
      valores.push(desdeFecha);
      condiciones.push(`o.fecha_inicio >= $${valores.length}::date`);
    }
    if (distrito) {
      valores.push(`%${distrito}%`);
      condiciones.push(`o.distrito ILIKE $${valores.length}`);
    }
    if (tarifaMin !== null && tarifaMin !== undefined) {
      valores.push(tarifaMin);
      condiciones.push(`o.tarifa_hora >= $${valores.length}`);
    }
    if (q) {
      valores.push(`%${q}%`);
      condiciones.push(`(o.titulo ILIKE $${valores.length} OR o.descripcion ILIKE $${valores.length})`);
    }

    const result = await this.pool.query(
      `SELECT ${COLUMNAS_OFERTA}
       FROM oferta_trabajo o
       JOIN padre p ON p.id_padre = o.id_padre
       WHERE ${condiciones.join(' AND ')}
       ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
       LIMIT 100;`,
      valores,
    );
    return result.rows.map(filaAOferta);
  }

  async findById(idOferta) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS_OFERTA}
       FROM oferta_trabajo o
       JOIN padre p ON p.id_padre = o.id_padre
       WHERE o.id_oferta = $1
       LIMIT 1;`,
      [idOferta],
    );
    if (result.rows.length === 0) return null;
    return filaAOferta(result.rows[0]);
  }

  async crearOferta(idPadre, datos) {
    const result = await this.pool.query(
      `INSERT INTO oferta_trabajo
         (id_padre, titulo, descripcion, distrito, fecha_inicio, hora_inicio, hora_fin,
          tarifa_hora, numero_ninos, edades_ninos, requisitos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id_oferta;`,
      [
        idPadre,
        datos.titulo,
        datos.descripcion,
        datos.distrito,
        datos.fechaInicio,
        datos.horaInicio,
        datos.horaFin,
        datos.tarifaHora,
        datos.numeroNinos,
        datos.edadesNinos,
        datos.requisitos,
      ],
    );
    return this.findById(result.rows[0].id_oferta);
  }

  async listarPorPadre(idPadre) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS_OFERTA}
       FROM oferta_trabajo o
       JOIN padre p ON p.id_padre = o.id_padre
       WHERE o.id_padre = $1
       ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC;`,
      [idPadre],
    );
    return result.rows.map(filaAOferta);
  }

  async listarIdsOfertasPostuladas(idNinera) {
    const result = await this.pool.query(
      `SELECT id_oferta FROM postulacion WHERE id_ninera = $1;`,
      [idNinera],
    );
    return result.rows.map((fila) => fila.id_oferta);
  }

  async crearPostulacion(idOferta, idNinera, mensaje) {
    try {
      const result = await this.pool.query(
        `INSERT INTO postulacion (id_oferta, id_ninera, mensaje)
         VALUES ($1, $2, $3)
         RETURNING id_postulacion, id_oferta, id_ninera, mensaje, estado, fecha_postulacion;`,
        [idOferta, idNinera, mensaje],
      );
      return filaAPostulacion(result.rows[0]);
    } catch (error) {
      // 23505: violación de UNIQUE (id_oferta, id_ninera)
      if (error.code === '23505') {
        throw new ConflictError('Ya te postulaste a esta oferta.');
      }
      throw error;
    }
  }

  async listarPostulacionesPorNinera(idNinera) {
    const result = await this.pool.query(
      `SELECT ps.id_postulacion, ps.id_oferta, ps.id_ninera, ps.mensaje, ps.estado, ps.fecha_postulacion,
              o.titulo, o.distrito, o.tarifa_hora, o.estado AS estado_oferta,
              to_char(o.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              to_char(o.hora_inicio, 'HH24:MI') AS hora_inicio,
              to_char(o.hora_fin, 'HH24:MI') AS hora_fin,
              p.nombre_familia
       FROM postulacion ps
       JOIN oferta_trabajo o ON o.id_oferta = ps.id_oferta
       JOIN padre p ON p.id_padre = o.id_padre
       WHERE ps.id_ninera = $1
       ORDER BY ps.fecha_postulacion DESC, ps.id_postulacion DESC;`,
      [idNinera],
    );
    return result.rows.map((fila) =>
      filaAPostulacion(fila, {
        id: fila.id_oferta,
        titulo: fila.titulo,
        distrito: fila.distrito,
        tarifaHora: Number(fila.tarifa_hora),
        estado: fila.estado_oferta,
        fechaInicio: fila.fecha_inicio,
        horaInicio: fila.hora_inicio,
        horaFin: fila.hora_fin,
        familia: { nombre: fila.nombre_familia || 'Familia' },
      }),
    );
  }
}

function filaAOferta(fila) {
  return new OfertaTrabajo({
    id: fila.id_oferta,
    idPadre: fila.id_padre,
    nombreFamilia: fila.nombre_familia,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    distrito: fila.distrito,
    fechaInicio: fila.fecha_inicio,
    horaInicio: fila.hora_inicio,
    horaFin: fila.hora_fin,
    tarifaHora: fila.tarifa_hora,
    numeroNinos: fila.numero_ninos,
    edadesNinos: fila.edades_ninos,
    requisitos: fila.requisitos,
    estado: fila.estado,
    fechaPublicacion: fila.fecha_publicacion,
    totalPostulaciones: fila.total_postulaciones,
  });
}

function filaAPostulacion(fila, oferta = null) {
  return new Postulacion({
    id: fila.id_postulacion,
    idOferta: fila.id_oferta,
    idNinera: fila.id_ninera,
    mensaje: fila.mensaje,
    estado: fila.estado,
    fechaPostulacion: fila.fecha_postulacion,
    oferta,
  });
}

module.exports = PostgresOfertaTrabajoRepository;
