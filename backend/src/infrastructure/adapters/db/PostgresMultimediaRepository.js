const MultimediaRepositoryPort = require('../../../application/ports/MultimediaRepositoryPort');
const Certificado = require('../../../domain/entities/Certificado');

const COLUMNAS_CERTIFICADO = `
  id_certificado, id_ninera, tipo, nombre, institucion,
  TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
  TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
  archivo_public_id, archivo_formato, archivo_tipo_recurso, estado_revision, fecha_subida
`;

/**
 * Adaptador Secundario: foto de perfil y certificados en PostgreSQL (Neon) (HU8)
 * Requiere la migración database/migrations/001_hu8_multimedia.sql
 */
class PostgresMultimediaRepository extends MultimediaRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async obtenerFoto(idUsuario) {
    const result = await this.pool.query(
      'SELECT foto_url, foto_public_id FROM usuario WHERE id_usuario = $1 LIMIT 1;',
      [idUsuario],
    );
    const row = result.rows[0];
    if (!row || !row.foto_url) return null;
    return { url: row.foto_url, publicId: row.foto_public_id };
  }

  async guardarFoto(idUsuario, { url, publicId }) {
    await this.pool.query(
      'UPDATE usuario SET foto_url = $2, foto_public_id = $3 WHERE id_usuario = $1;',
      [idUsuario, url, publicId],
    );
  }

  async contarCertificados(idNinera) {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS total FROM certificado WHERE id_ninera = $1;',
      [idNinera],
    );
    return result.rows[0].total;
  }

  async listarCertificados(idNinera) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS_CERTIFICADO} FROM certificado WHERE id_ninera = $1 ORDER BY fecha_subida DESC;`,
      [idNinera],
    );
    return result.rows.map(aCertificado);
  }

  async crearCertificado(datos) {
    const result = await this.pool.query(
      `INSERT INTO certificado
         (id_ninera, tipo, nombre, institucion, fecha_emision, fecha_vencimiento,
          archivo_public_id, archivo_formato, archivo_tipo_recurso)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COLUMNAS_CERTIFICADO};`,
      [
        datos.idNinera,
        datos.tipo,
        datos.nombre,
        datos.institucion,
        datos.fechaEmision,
        datos.fechaVencimiento,
        datos.archivoPublicId,
        datos.archivoFormato,
        datos.archivoTipoRecurso,
      ],
    );
    return aCertificado(result.rows[0]);
  }

  async buscarCertificado(idCertificado) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS_CERTIFICADO} FROM certificado WHERE id_certificado = $1 LIMIT 1;`,
      [idCertificado],
    );
    return result.rows.length ? aCertificado(result.rows[0]) : null;
  }

  async eliminarCertificado(idCertificado) {
    await this.pool.query('DELETE FROM certificado WHERE id_certificado = $1;', [idCertificado]);
  }
}

function aCertificado(row) {
  return new Certificado({
    id: row.id_certificado,
    idNinera: row.id_ninera,
    tipo: row.tipo,
    nombre: row.nombre,
    institucion: row.institucion,
    fechaEmision: row.fecha_emision,
    fechaVencimiento: row.fecha_vencimiento,
    archivoPublicId: row.archivo_public_id,
    archivoFormato: row.archivo_formato,
    archivoTipoRecurso: row.archivo_tipo_recurso,
    estadoRevision: row.estado_revision,
    fechaSubida: row.fecha_subida,
  });
}

module.exports = PostgresMultimediaRepository;
