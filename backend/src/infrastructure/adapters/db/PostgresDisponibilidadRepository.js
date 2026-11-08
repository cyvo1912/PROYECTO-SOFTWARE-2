const DisponibilidadRepositoryPort = require('../../../application/ports/DisponibilidadRepositoryPort');
const Disponibilidad = require('../../../domain/entities/Disponibilidad');

/**
 * Adaptador Secundario (DAO PostgreSQL): PostgresDisponibilidadRepository
 * Implementa DisponibilidadRepositoryPort aislando todas las consultas SQL.
 */
class PostgresDisponibilidadRepository extends DisponibilidadRepositoryPort {
  constructor(pool) {
    super();
    if (!pool) throw new Error('pool de PostgreSQL es requerido en PostgresDisponibilidadRepository');
    this.pool = pool;
  }

  async listarNinerasActivas() {
    const query = `
      SELECT
        n.id_ninera,
        u.nombre_usuario,
        u.apellido_usuario,
        u.estado_cuenta,
        n.tarifa_hora,
        n.zona,
        n.verificada
      FROM ninera n
      INNER JOIN usuario u ON u.id_usuario = n.id_ninera
      WHERE u.tipo_usuario = 'NINERA'
        AND u.estado_cuenta = 'ACTIVA'
      ORDER BY n.verificada DESC, u.nombre_usuario ASC;
    `;
    const result = await this.pool.query(query);
    return result.rows.map((row) => ({
      idNinera: row.id_ninera,
      nombreCompleto: `${row.nombre_usuario} ${row.apellido_usuario}`.trim(),
      estadoCuenta: row.estado_cuenta,
      tarifaHora: Number(row.tarifa_hora),
      zona: row.zona,
      verificada: Boolean(row.verificada),
    }));
  }

  async obtenerResumenNinera(idNinera) {
    const query = `
      SELECT
        n.id_ninera,
        u.nombre_usuario,
        u.apellido_usuario,
        u.estado_cuenta,
        n.tarifa_hora,
        n.zona,
        n.verificada
      FROM ninera n
      INNER JOIN usuario u ON u.id_usuario = n.id_ninera
      WHERE n.id_ninera = $1
        AND u.tipo_usuario = 'NINERA'
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [idNinera]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      idNinera: row.id_ninera,
      nombreCompleto: `${row.nombre_usuario} ${row.apellido_usuario}`.trim(),
      estadoCuenta: row.estado_cuenta,
      tarifaHora: Number(row.tarifa_hora),
      zona: row.zona,
      verificada: Boolean(row.verificada),
    };
  }

  async listarDisponibilidadPorRango(idNinera, fechaDesde, fechaHasta) {
    const query = `
      SELECT
        id_disponibilidad,
        id_ninera,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        dia_semana,
        TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
        TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin,
        estado
      FROM disponibilidad
      WHERE id_ninera = $1
        AND (
          (fecha IS NOT NULL AND fecha BETWEEN $2::date AND $3::date)
          OR (fecha IS NULL AND dia_semana IS NOT NULL)
        )
      ORDER BY fecha ASC NULLS LAST, hora_inicio ASC;
    `;
    const result = await this.pool.query(query, [idNinera, fechaDesde, fechaHasta]);
    return result.rows.map(filaADisponibilidad);
  }

  async listarReservasActivasPorRango(idNinera, fechaDesde, fechaHasta) {
    const query = `
      SELECT
        id_reserva,
        TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
        TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
        TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin,
        estado_reserva
      FROM reserva
      WHERE id_ninera = $1
        AND fecha_reserva BETWEEN $2::date AND $3::date
        AND LOWER(COALESCE(estado_reserva, 'pendiente')) NOT IN ('cancelada', 'rechazada')
      ORDER BY fecha_reserva ASC, hora_inicio ASC;
    `;
    const result = await this.pool.query(query, [idNinera, fechaDesde, fechaHasta]);
    return result.rows.map((row) => ({
      idReserva: row.id_reserva,
      fechaReserva: row.fecha_reserva,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      estadoReserva: row.estado_reserva,
    }));
  }
}

function filaADisponibilidad(row) {
  return new Disponibilidad({
    id: row.id_disponibilidad,
    idNinera: row.id_ninera,
    fecha: row.fecha,
    diaSemana: row.dia_semana,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    estado: row.estado,
  });
}

module.exports = PostgresDisponibilidadRepository;

