const ReservaRepositoryPort = require('../../../application/ports/ReservaRepositoryPort');

const SELECT_RESERVAS = `
  SELECT
    r.id_reserva,
    r.id_padre,
    r.id_ninera,
    r.id_hijo,
    r.fecha_reserva,
    r.hora_inicio,
    r.hora_fin,
    r.direccion,
    r.estado_reserva,
    r.comentario,
    p.nombre_familia,
    padre.nombre_usuario AS nombre_padre,
    padre.apellido_usuario AS apellido_padre,
    ninera.nombre_usuario AS nombre_ninera,
    ninera.apellido_usuario AS apellido_ninera,
    h.nombre_hijo
  FROM reserva r
  JOIN padre p ON p.id_padre = r.id_padre
  JOIN usuario padre ON padre.id_usuario = r.id_padre
  JOIN usuario ninera ON ninera.id_usuario = r.id_ninera
  LEFT JOIN hijo h ON h.id_hijo = r.id_hijo
`;

class PostgresReservaRepository extends ReservaRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarPorUsuario(idUsuario, rol) {
    const columna = columnaUsuario(rol);
    const result = await this.pool.query(
      `${SELECT_RESERVAS}
       WHERE r.${columna} = $1
       ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC, r.id_reserva DESC;`,
      [idUsuario],
    );
    return result.rows.map(filaAReserva);
  }

  async findById(idReserva) {
    const result = await this.pool.query(
      `${SELECT_RESERVAS}
       WHERE r.id_reserva = $1
       LIMIT 1;`,
      [idReserva],
    );
    return result.rows.length ? filaAReserva(result.rows[0]) : null;
  }

  async actualizarEstado(idReserva, idUsuario, rol, estado, estadosActuales) {
    const columna = columnaUsuario(rol);
    const result = await this.pool.query(
      `UPDATE reserva
       SET estado_reserva = $2
       WHERE id_reserva = $1
         AND ${columna} = $3
         AND LOWER(estado_reserva) = ANY($4::text[])
       RETURNING id_reserva;`,
      [idReserva, estado, idUsuario, estadosActuales],
    );
    if (!result.rows.length) return null;
    return this.findById(idReserva);
  }
}

function columnaUsuario(rol) {
  if (rol === 'FAMILIA') return 'id_padre';
  if (rol === 'NINERA') return 'id_ninera';
  throw new Error('Rol no válido para consultar reservas.');
}

function filaAReserva(row) {
  return {
    id: row.id_reserva,
    idPadre: row.id_padre,
    idNinera: row.id_ninera,
    idHijo: row.id_hijo,
    fecha: typeof row.fecha_reserva === 'string'
      ? row.fecha_reserva.slice(0, 10)
      : row.fecha_reserva?.toISOString?.().slice(0, 10) || null,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    direccion: row.direccion,
    estado: row.estado_reserva,
    comentario: row.comentario,
    nombreFamilia: row.nombre_familia,
    nombrePadre: [row.nombre_padre, row.apellido_padre].filter(Boolean).join(' '),
    nombreNinera: [row.nombre_ninera, row.apellido_ninera].filter(Boolean).join(' '),
    nombreHijo: row.nombre_hijo,
  };
}

module.exports = PostgresReservaRepository;
