const UserRepositoryPort = require('../../../application/ports/UserRepositoryPort');
const Usuario = require('../../../domain/entities/Usuario');
const Padre = require('../../../domain/entities/Padre');
const Ninera = require('../../../domain/entities/Ninera');
const { EmailAlreadyExistsError, DniAlreadyExistsError } = require('../../../domain/errors/DomainErrors');

/** Código de PostgreSQL para "violación de restricción única". */
const UNIQUE_VIOLATION = '23505';

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
    return filaAUsuario(result.rows[0]);
  }

  async findByDni(dni) {
    const query = `
      SELECT id_usuario, nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, celular, tipo_usuario, estado_cuenta
      FROM usuario
      WHERE dni = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [dni]);
    if (result.rows.length === 0) return null;
    return filaAUsuario(result.rows[0]);
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
      SELECT id_ninera, zona, experiencia, tarifa_hora, descripcion,
             latitud, longitud, anos_experiencia
      FROM ninera
      WHERE id_ninera = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [idUsuario]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Crea USUARIO + PADRE en una transacción (Diagrama de Clases - Sprint 1).
   * La cuenta de familia no requiere verificación manual, así que queda ACTIVA.
   */
  async crearPadre(datosUsuario, datosPadre) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const idUsuario = await insertarUsuario(client, datosUsuario, 'FAMILIA', 'ACTIVA');

      await client.query(
        `INSERT INTO padre (id_padre, nombre_familia, direccion, numero_ninos, edades_ninos)
         VALUES ($1, $2, $3, $4, $5)`,
        [idUsuario, datosPadre.nombreFamilia, datosPadre.direccion, datosPadre.numeroNinos, datosPadre.edadesNinos],
      );

      await client.query('COMMIT');

      return new Padre(
        { id: idUsuario, ...datosUsuario, tipoUsuario: 'FAMILIA', estadoCuenta: 'ACTIVA' },
        { idPadre: idUsuario, nombreFamilia: datosPadre.nombreFamilia, direccion: datosPadre.direccion, numeroNinos: datosPadre.numeroNinos, edadesNinos: datosPadre.edadesNinos },
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw traducirViolacionUnica(error);
    } finally {
      client.release();
    }
  }

  /**
   * Crea USUARIO + NIÑERA en una transacción. Restricción 13: la cuenta de
   * niñera queda PENDIENTE_VERIFICACION hasta que un administrador la apruebe.
   */
  async crearNinera(datosUsuario, datosNinera) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const idUsuario = await insertarUsuario(client, datosUsuario, 'NINERA', 'PENDIENTE_VERIFICACION');

      await client.query(
        `INSERT INTO ninera (id_ninera, experiencia, tarifa_hora, descripcion)
         VALUES ($1, $2, $3, $4)`,
        [idUsuario, datosNinera.experiencia, datosNinera.tarifaHora, datosNinera.descripcion],
      );

      await client.query('COMMIT');

      return new Ninera(
        { id: idUsuario, ...datosUsuario, tipoUsuario: 'NINERA', estadoCuenta: 'PENDIENTE_VERIFICACION' },
        { idNinera: idUsuario, experiencia: datosNinera.experiencia, tarifaHora: datosNinera.tarifaHora, descripcion: datosNinera.descripcion },
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw traducirViolacionUnica(error);
    } finally {
      client.release();
    }
  }

  async findById(idUsuario) {
    const query = `
      SELECT id_usuario, nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, celular, tipo_usuario, estado_cuenta
      FROM usuario
      WHERE id_usuario = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [idUsuario]);
    if (result.rows.length === 0) return null;
    return filaAUsuario(result.rows[0]);
  }

  /**
   * Actualiza el perfil profesional de una niñera (HU5 / Figura 6).
   * Ejecuta en una transacción la actualización de tabla usuario y tabla ninera.
   * Por diseño y seguridad, NO modifica DNI ni correo.
   */
  async actualizarPerfilNinera(idUsuario, datosUsuario, datosNinera) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Actualizar datos personales permitidos en tabla usuario
      const usuarioQuery = `
        UPDATE usuario
        SET nombre_usuario = $1, apellido_usuario = $2, celular = $3
        WHERE id_usuario = $4
        RETURNING id_usuario, nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, celular, tipo_usuario, estado_cuenta;
      `;
      const resUsuario = await client.query(usuarioQuery, [
        datosUsuario.nombre,
        datosUsuario.apellido,
        datosUsuario.celular,
        idUsuario,
      ]);

      if (resUsuario.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar datos profesionales en tabla ninera
      // anos_experiencia (HU11) es opcional: si no se envía, se conserva el valor previo.
      const nineraQuery = `
        UPDATE ninera
        SET zona = $1, experiencia = $2, tarifa_hora = $3, descripcion = $4,
            anos_experiencia = COALESCE($5, anos_experiencia)
        WHERE id_ninera = $6
        RETURNING id_ninera, zona, experiencia, tarifa_hora, descripcion,
                  latitud, longitud, anos_experiencia;
      `;
      const resNinera = await client.query(nineraQuery, [
        datosNinera.zona || null,
        datosNinera.experiencia,
        datosNinera.tarifaHora,
        datosNinera.descripcion || null,
        datosNinera.anosExperiencia !== undefined ? datosNinera.anosExperiencia : null,
        idUsuario,
      ]);

      await client.query('COMMIT');

      const uRow = resUsuario.rows[0];
      const nRow = resNinera.rows[0] || {};

      const nineraActualizada = new Ninera(
        filaAUsuario(uRow),
        {
          idNinera: nRow.id_ninera || idUsuario,
          zona: nRow.zona,
          experiencia: nRow.experiencia,
          tarifaHora: nRow.tarifa_hora,
          descripcion: nRow.descripcion,
        }
      );
      nineraActualizada.latitud = nRow.latitud !== undefined ? nRow.latitud : null;
      nineraActualizada.longitud = nRow.longitud !== undefined ? nRow.longitud : null;
      nineraActualizada.anosExperiencia = nRow.anos_experiencia !== undefined ? nRow.anos_experiencia : null;
      return nineraActualizada;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * HU11: guarda las coordenadas capturadas por GPS en el panel de la niñera.
   * Es independiente de actualizarPerfilNinera para no obligar a reenviar
   * todo el formulario de perfil cada vez que se actualiza la ubicación.
   */
  async actualizarUbicacionNinera(idUsuario, latitud, longitud) {
    const query = `
      UPDATE ninera
      SET latitud = $1, longitud = $2
      WHERE id_ninera = $3
      RETURNING id_ninera, zona, experiencia, tarifa_hora, descripcion,
                latitud, longitud, anos_experiencia;
    `;
    const result = await this.pool.query(query, [latitud, longitud, idUsuario]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * HU11: búsqueda de niñeras por proximidad geográfica (fórmula de
   * Haversine calculada en SQL, sin depender de extensiones PostGIS),
   * con filtros opcionales de tarifa máxima y años de experiencia mínimos.
   * Solo se consideran niñeras con cuenta ACTIVA, verificada y con
   * ubicación registrada. Resultados ordenados por distancia ascendente.
   */
  async buscarNinerasCercanas(filtros) {
    const { latitud, longitud, radioKm, tarifaMaxima, experienciaMinima } = filtros;

    const condiciones = [
      `u.tipo_usuario = 'NINERA'`,
      `u.estado_cuenta = 'ACTIVA'`,
      `n.verificada = TRUE`,
      `n.latitud IS NOT NULL`,
      `n.longitud IS NOT NULL`,
    ];
    const valores = [latitud, longitud];

    if (tarifaMaxima !== undefined && tarifaMaxima !== null) {
      valores.push(tarifaMaxima);
      condiciones.push(`n.tarifa_hora <= $${valores.length}`);
    }

    if (experienciaMinima !== undefined && experienciaMinima !== null) {
      valores.push(experienciaMinima);
      condiciones.push(`n.anos_experiencia IS NOT NULL AND n.anos_experiencia >= $${valores.length}`);
    }

    valores.push(radioKm);
    const indiceRadio = valores.length;

    // Haversine: distancia en km entre (latitud, longitud) de la familia ($1, $2)
    // y la ubicación guardada de cada niñera. Se calcula en un CTE porque el
    // alias "distancia_km" no puede reutilizarse en el WHERE del mismo SELECT.
    const query = `
      WITH candidatas AS (
        SELECT
          u.id_usuario, u.nombre_usuario, u.apellido_usuario, u.correo, u.celular,
          u.foto_url,
          n.id_ninera, n.zona, n.experiencia, n.anos_experiencia, n.tarifa_hora,
          n.descripcion, n.verificada, n.calificacion_promedio, n.latitud, n.longitud,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(n.latitud)) *
                cos(radians(n.longitud) - radians($2)) +
                sin(radians($1)) * sin(radians(n.latitud))
              ))
            )
          ) AS distancia_km
        FROM ninera n
        INNER JOIN usuario u ON u.id_usuario = n.id_ninera
        WHERE ${condiciones.join(' AND ')}
      )
      SELECT *
      FROM candidatas
      WHERE distancia_km <= $${indiceRadio}
      ORDER BY distancia_km ASC;
    `;

    const result = await this.pool.query(query, valores);
    return result.rows;
  }

  async actualizarPerfilPadre(idUsuario, datosUsuario, datosPadre) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const usuarioQuery = `
        UPDATE usuario
        SET nombre_usuario = $1, apellido_usuario = $2, celular = $3
        WHERE id_usuario = $4
        RETURNING id_usuario, nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, celular, tipo_usuario, estado_cuenta;
      `;
      const resUsuario = await client.query(usuarioQuery, [
        datosUsuario.nombre,
        datosUsuario.apellido,
        datosUsuario.celular,
        idUsuario,
      ]);

      if (resUsuario.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const padreQuery = `
        UPDATE padre
        SET nombre_familia = $1, direccion = $2, numero_ninos = $3, edades_ninos = $4
        WHERE id_padre = $5
        RETURNING id_padre, nombre_familia, direccion, numero_ninos, edades_ninos, informacion_adicional;
      `;
      const resPadre = await client.query(padreQuery, [
        datosPadre.nombreFamilia,
        datosPadre.direccion,
        datosPadre.numeroNinos,
        datosPadre.edadesNinos,
        idUsuario,
      ]);

      await client.query('COMMIT');

      const uRow = resUsuario.rows[0];
      const pRow = resPadre.rows[0] || {};

      return new Padre(
        filaAUsuario(uRow),
        {
          idPadre: pRow.id_padre || idUsuario,
          nombreFamilia: pRow.nombre_familia,
          direccion: pRow.direccion,
          numeroNinos: pRow.numero_ninos,
          edadesNinos: pRow.edades_ninos,
          informacionAdicional: pRow.informacion_adicional,
        }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function filaAUsuario(row) {
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

async function insertarUsuario(client, datos, tipoUsuario, estadoCuenta) {
  const result = await client.query(
    `INSERT INTO usuario (nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, celular, tipo_usuario, estado_cuenta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_usuario`,
    [datos.nombre, datos.apellido, datos.correo, datos.dni, datos.contrasenaHash, datos.celular, tipoUsuario, estadoCuenta],
  );
  return result.rows[0].id_usuario;
}

/**
 * Red de seguridad ante una carrera entre el chequeo previo (findByEmail/findByDni)
 * y el INSERT: traduce la violación de índice único de Postgres al error de
 * dominio correspondiente, en vez de dejar escapar un error crudo de la BD.
 */
function traducirViolacionUnica(error) {
  if (error && error.code === UNIQUE_VIOLATION) {
    if (error.constraint && error.constraint.includes('dni')) return new DniAlreadyExistsError();
    if (error.constraint && error.constraint.includes('correo')) return new EmailAlreadyExistsError();
  }
  return error;
}

module.exports = PostgresUserRepository;