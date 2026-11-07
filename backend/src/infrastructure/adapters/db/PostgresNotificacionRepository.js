const NotificacionRepositoryPort = require('../../../application/ports/NotificacionRepositoryPort');

class PostgresNotificacionRepository extends NotificacionRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async registrarToken(idUsuario, token, plataforma) {
    const result = await this.pool.query(
      `
      INSERT INTO dispositivo_push (
        id_usuario,
        expo_push_token,
        plataforma,
        activo
      )
      VALUES ($1, $2, $3, TRUE)
      ON CONFLICT (expo_push_token)
      DO UPDATE SET
        id_usuario = EXCLUDED.id_usuario,
        plataforma = EXCLUDED.plataforma,
        activo = TRUE
      RETURNING *;
      `,
      [idUsuario, token, plataforma],
    );

    return result.rows[0];
  }

  async listarPorUsuario(idUsuario) {
    const result = await this.pool.query(
      `
      SELECT
        id_notificacion,
        id_reserva,
        titulo,
        mensaje,
        tipo,
        leida,
        fecha_creacion
      FROM notificacion
      WHERE id_usuario = $1
      ORDER BY fecha_creacion DESC;
      `,
      [idUsuario],
    );

    return result.rows;
  }

  async marcarComoLeida(idNotificacion, idUsuario) {
    const result = await this.pool.query(
      `
      UPDATE notificacion
      SET leida = TRUE
      WHERE id_notificacion = $1
        AND id_usuario = $2
      RETURNING *;
      `,
      [idNotificacion, idUsuario],
    );

    return result.rows[0] || null;
  }

  async crearNotificacion(datos) {
    const result = await this.pool.query(
      `
      INSERT INTO notificacion (
        id_usuario,
        id_reserva,
        titulo,
        mensaje,
        tipo
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [
        datos.idUsuario,
        datos.idReserva,
        datos.titulo,
        datos.mensaje,
        datos.tipo,
      ],
    );

    return result.rows[0];
  }

  async obtenerTokensActivos(idUsuario) {
    const result = await this.pool.query(
      `
      SELECT expo_push_token
      FROM dispositivo_push
      WHERE id_usuario = $1
        AND activo = TRUE;
      `,
      [idUsuario],
    );

    return result.rows.map((row) => row.expo_push_token);
  }
}

module.exports = PostgresNotificacionRepository;