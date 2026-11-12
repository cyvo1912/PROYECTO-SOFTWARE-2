const ReservaRepositoryPort = require('../../../application/ports/ReservaRepositoryPort');
const Reserva = require('../../../domain/entities/Reserva');

const COLUMNAS = `
  id_reserva,
  id_padre,
  id_ninera,
  id_hijo,
  TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
  TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
  TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin,
  direccion,
  estado_reserva,
  comentario,
  tarifa_hora,
  horas,
  monto_total,
  fecha_creacion,
  expira_en
`;

// Activa = no cancelada/rechazada y, si está pendiente, todavía dentro de sus 10 min para pagar.
const FILTRO_ACTIVA = `LOWER(COALESCE(estado_reserva, 'pendiente')) NOT IN ('cancelada', 'rechazada')
  AND NOT (
    LOWER(COALESCE(estado_reserva, 'pendiente')) = 'pendiente'
    AND expira_en IS NOT NULL
    AND expira_en <= NOW()
  )`;

/**
 * Adaptador Secundario (DAO PostgreSQL): PostgresReservaRepository
 */
class PostgresReservaRepository extends ReservaRepositoryPort {
  constructor(pool) {
    super();
    if (!pool) throw new Error('pool de PostgreSQL es requerido en PostgresReservaRepository');
    this.pool = pool;
  }

  async listarActivasDeNineraEnFecha(idNinera, fecha) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_ninera = $1 AND fecha_reserva = $2::date AND ${FILTRO_ACTIVA}
       ORDER BY hora_inicio ASC;`,
      [idNinera, fecha],
    );
    return result.rows.map(filaAReserva);
  }

  async listarActivasDeHijoEnFecha(idHijo, fecha) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_hijo = $1 AND fecha_reserva = $2::date AND ${FILTRO_ACTIVA}
       ORDER BY hora_inicio ASC;`,
      [idHijo, fecha],
    );
    return result.rows.map(filaAReserva);
  }

  /**
   * INSERT ... SELECT ... WHERE NOT EXISTS: el chequeo y el guardado van en
   * UNA sola sentencia. Si entre la validación del servicio y este INSERT otra
   * familia tomó el horario, no se inserta nada y se devuelve null.
   */
  async crearSiNoHaySolapamiento(reserva) {
    const result = await this.pool.query(
      `INSERT INTO reserva (
         id_padre, id_ninera, id_hijo, fecha_reserva, hora_inicio, hora_fin,
         direccion, estado_reserva, comentario, tarifa_hora, horas, monto_total, expira_en
       )
       SELECT $1, $2, $3, $4::date, $5::time, $6::time, $7, 'Pendiente', $8, $9, $10, $11, $12::timestamptz
       WHERE NOT EXISTS (
         SELECT 1 FROM reserva
         WHERE id_ninera = $2
           AND fecha_reserva = $4::date
           AND ${FILTRO_ACTIVA}
           AND hora_inicio < $6::time
           AND $5::time < hora_fin
       )
       RETURNING ${COLUMNAS};`,
      [
        reserva.idPadre,
        reserva.idNinera,
        reserva.idHijo,
        reserva.fechaReserva,
        reserva.horaInicio,
        reserva.horaFin,
        reserva.direccion,
        reserva.comentario,
        reserva.tarifaHora,
        reserva.horas,
        reserva.montoTotal,
        reserva.expiraEn,
      ],
    );
    if (result.rows.length === 0) return null;
    return filaAReserva(result.rows[0]);
  }

  async listarPorPadre(idPadre) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_padre = $1
       ORDER BY fecha_reserva DESC, hora_inicio DESC;`,
      [idPadre],
    );
    return result.rows.map(filaAReserva);
  }

  async listarPorNinera(idNinera) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_ninera = $1
       ORDER BY fecha_reserva DESC, hora_inicio DESC;`,
      [idNinera],
    );
    return result.rows.map(filaAReserva);
  }

  async buscarPorId(idReserva) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva WHERE id_reserva = $1;`,
      [idReserva],
    );
    return result.rows[0] ? filaAReserva(result.rows[0]) : null;
  }

  async actualizarEstado(idReserva, estadoReserva, estadosEsperados) {
    const result = await this.pool.query(
      `UPDATE reserva SET estado_reserva = $2
       WHERE id_reserva = $1
         AND LOWER(COALESCE(estado_reserva, 'pendiente')) = ANY($3::text[])
       RETURNING ${COLUMNAS};`,
      [idReserva, estadoReserva, estadosEsperados.map((estado) => String(estado).toLowerCase())],
    );
    return result.rows[0] ? filaAReserva(result.rows[0]) : null;
  }
}

function filaAReserva(row) {
  return new Reserva({
    id: row.id_reserva,
    idPadre: row.id_padre,
    idNinera: row.id_ninera,
    idHijo: row.id_hijo,
    fechaReserva: row.fecha_reserva,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    direccion: row.direccion,
    estadoReserva: row.estado_reserva,
    comentario: row.comentario,
    tarifaHora: row.tarifa_hora !== null ? Number(row.tarifa_hora) : null,
    horas: row.horas !== null ? Number(row.horas) : null,
    montoTotal: row.monto_total !== null ? Number(row.monto_total) : null,
    fechaCreacion: row.fecha_creacion,
    expiraEn: row.expira_en,
  });
}

module.exports = PostgresReservaRepository;
