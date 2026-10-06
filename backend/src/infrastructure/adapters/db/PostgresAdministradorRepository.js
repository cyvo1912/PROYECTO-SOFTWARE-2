const AdministradorRepositoryPort = require('../../../application/ports/AdministradorRepositoryPort');

class PostgresAdministradorRepository extends AdministradorRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarNinerasPendientes() {
    const result = await this.pool.query(`
      SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.apellido_usuario,
        u.correo,
        u.dni,
        u.celular,
        u.estado_cuenta,
        u.fecha_registro,
        n.zona,
        n.experiencia,
        n.tarifa_hora,
        n.descripcion,
        n.verificada,
        (
          SELECT COUNT(*)
          FROM certificado c
          WHERE c.id_ninera = u.id_usuario
        )::int AS total_certificados,
        (
          SELECT COUNT(*)
          FROM certificado c
          WHERE c.id_ninera = u.id_usuario
          AND c.estado_revision = 'PENDIENTE'
        )::int AS certificados_pendientes
      FROM usuario u
      INNER JOIN ninera n
        ON n.id_ninera = u.id_usuario
      WHERE u.tipo_usuario = 'NINERA'
        AND u.estado_cuenta = 'PENDIENTE_VERIFICACION'
      ORDER BY u.fecha_registro ASC;
    `);

    return result.rows;
  }

  async obtenerNinera(idNinera) {
    const usuarioResult = await this.pool.query(
      `
      SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.apellido_usuario,
        u.correo,
        u.dni,
        u.celular,
        u.estado_cuenta,
        u.fecha_registro,
        n.zona,
        n.experiencia,
        n.tarifa_hora,
        n.descripcion,
        n.verificada,
        n.calificacion_promedio
      FROM usuario u
      INNER JOIN ninera n
        ON n.id_ninera = u.id_usuario
      WHERE u.id_usuario = $1
        AND u.tipo_usuario = 'NINERA'
      LIMIT 1;
      `,
      [idNinera],
    );

    if (usuarioResult.rows.length === 0) {
      return null;
    }

    const certificadosResult = await this.pool.query(
      `
      SELECT
        id_certificado,
        id_ninera,
        tipo,
        nombre,
        institucion,
        TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        archivo_public_id,
        archivo_formato,
        archivo_tipo_recurso,
        estado_revision,
        fecha_subida
      FROM certificado
      WHERE id_ninera = $1
      ORDER BY fecha_subida DESC;
      `,
      [idNinera],
    );

    return {
      usuario: usuarioResult.rows[0],
      certificados: certificadosResult.rows,
    };
  }

  async actualizarEstadoCertificado(idCertificado, estado) {
    const result = await this.pool.query(
      `
      UPDATE certificado
      SET estado_revision = $2
      WHERE id_certificado = $1
      RETURNING
        id_certificado,
        id_ninera,
        tipo,
        nombre,
        institucion,
        TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
        TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
        archivo_public_id,
        archivo_formato,
        archivo_tipo_recurso,
        estado_revision,
        fecha_subida;
      `,
      [idCertificado, estado],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async activarNinera(idNinera) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const usuarioResult = await client.query(
        `
        UPDATE usuario
        SET estado_cuenta = 'ACTIVA'
        WHERE id_usuario = $1
          AND tipo_usuario = 'NINERA'
        RETURNING id_usuario, estado_cuenta;
        `,
        [idNinera],
      );

      if (usuarioResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `
        UPDATE ninera
        SET verificada = TRUE
        WHERE id_ninera = $1;
        `,
        [idNinera],
      );

      await client.query('COMMIT');

      return usuarioResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresAdministradorRepository;