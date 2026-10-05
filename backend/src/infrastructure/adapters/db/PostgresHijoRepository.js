const HijoRepositoryPort = require('../../../application/ports/HijoRepositoryPort');
const Hijo = require('../../../domain/entities/Hijo');

const COLUMNAS = 'id_hijo, id_padre, nombre_hijo, edad, alergias, condiciones_medicas, notas';

/**
 * Adaptador Secundario: Repositorio de Hijos en PostgreSQL (Neon)
 * Implementa el puerto HijoRepositoryPort
 */
class PostgresHijoRepository extends HijoRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listarPorPadre(idPadre) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM hijo WHERE id_padre = $1 ORDER BY id_hijo;`,
      [idPadre],
    );
    return result.rows.map(filaAHijo);
  }

  async findById(idHijo) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM hijo WHERE id_hijo = $1 LIMIT 1;`,
      [idHijo],
    );
    if (result.rows.length === 0) return null;
    return filaAHijo(result.rows[0]);
  }

  async crear(idPadre, datosHijo) {
    const result = await this.pool.query(
      `INSERT INTO hijo (id_padre, nombre_hijo, edad, alergias, condiciones_medicas, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNAS};`,
      [idPadre, datosHijo.nombre, datosHijo.edad, datosHijo.alergias, datosHijo.condicionesMedicas, datosHijo.notas],
    );
    return filaAHijo(result.rows[0]);
  }

  async actualizar(idHijo, datosHijo) {
    const result = await this.pool.query(
      `UPDATE hijo
       SET nombre_hijo = $1, edad = $2, alergias = $3, condiciones_medicas = $4, notas = $5
       WHERE id_hijo = $6
       RETURNING ${COLUMNAS};`,
      [datosHijo.nombre, datosHijo.edad, datosHijo.alergias, datosHijo.condicionesMedicas, datosHijo.notas, idHijo],
    );
    if (result.rows.length === 0) return null;
    return filaAHijo(result.rows[0]);
  }
}

function filaAHijo(row) {
  return new Hijo({
    id: row.id_hijo,
    idPadre: row.id_padre,
    nombre: row.nombre_hijo,
    edad: row.edad,
    alergias: row.alergias,
    condicionesMedicas: row.condiciones_medicas,
    notas: row.notas,
  });
}

module.exports = PostgresHijoRepository;
