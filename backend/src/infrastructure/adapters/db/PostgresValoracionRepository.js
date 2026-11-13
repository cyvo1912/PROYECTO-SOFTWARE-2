const ValoracionRepositoryPort = require('../../../application/ports/ValoracionRepositoryPort');

class PostgresValoracionRepository extends ValoracionRepositoryPort {
  constructor(pool) { super(); this.pool = pool; }

  async existeParaReserva(idReserva) {
    const result = await this.pool.query('SELECT 1 FROM valoracion WHERE id_reserva = $1;', [idReserva]);
    return result.rowCount > 0;
  }

  async crear({ idReserva, idPadre, idNinera, calificacion, comentario }) {
    const result = await this.pool.query(
      `INSERT INTO valoracion (id_reserva, id_padre, id_ninera, calificacion, comentario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_valoracion AS id, id_reserva AS "idReserva", id_ninera AS "idNinera", calificacion, comentario, fecha_valoracion AS "fechaValoracion";`,
      [idReserva, idPadre, idNinera, calificacion, comentario],
    );
    return result.rows[0];
  }

  async listarPorNinera(idNinera) {
    const result = await this.pool.query(
      `SELECT id_valoracion AS id, id_reserva AS "idReserva", calificacion, comentario, fecha_valoracion AS "fechaValoracion"
       FROM valoracion WHERE id_ninera = $1 ORDER BY fecha_valoracion DESC, id_valoracion DESC;`,
      [idNinera],
    );
    return result.rows;
  }
}

module.exports = PostgresValoracionRepository;
