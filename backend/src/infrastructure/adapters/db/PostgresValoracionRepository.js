
const ValoracionRepositoryPort = require('../../../application/ports/ValoracionRepositoryPort');

class PostgresValoracionRepository extends ValoracionRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }
  // Verificar si una reserva ya fue valorada
  async existeParaReserva(idReserva) {
    const result = await this.pool.query(
      `
      SELECT 1
      FROM valoracion
      WHERE id_reserva = $1
      LIMIT 1;
      `,
      [idReserva]
    );

    return result.rows.length > 0;
  }


  // Registrar una valoración y actualizar el promedio
  async crear(datos) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const reservaResult = await client.query(
        `
        SELECT
          id_reserva,
          id_padre,
          id_ninera
        FROM reserva
        WHERE id_reserva = $1
          AND id_padre = $2
          AND UPPER(TRIM(estado_reserva)) = 'COMPLETADA'
        FOR UPDATE;
        `,
        [datos.idReserva, datos.idPadre]
      );

      if (reservaResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const reserva = reservaResult.rows[0];

      const valoracionResult = await client.query(
        `
        INSERT INTO valoracion (
          id_reserva,
          id_padre,
          id_ninera,
          calificacion,
          comentario
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id_reserva) DO NOTHING
        RETURNING *;
        `,
        [
          datos.idReserva,
          datos.idPadre,
          reserva.id_ninera,
          datos.calificacion,
          datos.comentario,
        ]
      );

      if (valoracionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `
        UPDATE ninera
        SET calificacion_promedio = (
          SELECT ROUND(AVG(calificacion)::numeric, 2)
          FROM valoracion
          WHERE id_ninera = $1
        )
        WHERE id_ninera = $1;
        `,
        [reserva.id_ninera]
      );

      await client.query('COMMIT');

      return valoracionResult.rows[0];
    } catch (error) {
      console.error('=== ERROR AL CREAR VALORACIÓN HU18 ===');
      console.error('Mensaje:', error.message);
      console.error('Código PostgreSQL:', error.code);
      console.error('Detalle:', error.detail);
      console.error('Restricción:', error.constraint);
      console.error('Tabla:', error.table);

      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error al revertir transacción:', rollbackError.message);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Listar las valoraciones recibidas por una niñera
  async listarPorNinera(idNinera) {
    const result = await this.pool.query(
      `
      SELECT
        v.id_valoracion,
        v.id_reserva,
        v.id_padre,
        v.id_ninera,
        v.calificacion,
        v.comentario,
        v.fecha_creacion,
        u.nombre_usuario,
        u.apellido_usuario
      FROM valoracion v
      INNER JOIN usuario u
        ON u.id_usuario = v.id_padre
      WHERE v.id_ninera = $1
      ORDER BY v.fecha_creacion DESC, v.id_valoracion DESC;
      `,
      [idNinera]
    );

    return result.rows;
  }

  // Consultar la valoración de una reserva específica
  async obtenerPorReserva(idReserva) {
    const result = await this.pool.query(
      `
      SELECT *
      FROM valoracion
      WHERE id_reserva = $1;
      `,
      [idReserva]
    );

    return result.rows[0] || null;
  }
}

module.exports = PostgresValoracionRepository;
