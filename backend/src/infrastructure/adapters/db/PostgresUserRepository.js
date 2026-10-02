const UserRepositoryPort = require('../../../application/ports/UserRepositoryPort');
const Usuario = require('../../../domain/entities/Usuario');
const Padre = require('../../../domain/entities/Padre');
const Ninera = require('../../../domain/entities/Ninera');

/**
 * Adaptador Secundario: Repositorio de Usuarios en PostgreSQL (Neon)
 * Implementa el puerto UserRepositoryPort
 */
class PostgresUserRepository extends UserRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findByEmail(email) {
    const query = `
      SELECT id_usuario, nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, celular, tipo_usuario, estado_cuenta
      FROM usuario
      WHERE LOWER(correo) = LOWER($1)
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [email]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return new Usuario({
      id: row.id_usuario,
      nombre: row.nombre_usuario,
      apellido: row.apellido_usuario,
      correo: row.correo,
      dni: row.dni,
      contrasenaHash: row.contrasena_hash,
      celular: row.celular,
      tipoUsuario: row.tipo_usuario,
      estadoCuenta: row.estado_cuenta,
    });
  }

  async findPadreDetails(idUsuario) {
    const query = `
      SELECT id_padre, nombre_familia, direccion, numero_ninos, edades_ninos, informacion_adicional
      FROM padre
      WHERE id_padre = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [idUsuario]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async findNineraDetails(idUsuario) {
    const query = `
      SELECT id_ninera, zona, experiencia, tarifa_hora, descripcion
      FROM ninera
      WHERE id_ninera = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [idUsuario]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}

module.exports = PostgresUserRepository;
