const PerfilPublicoRepositoryPort = require('../../../application/ports/PerfilPublicoRepositoryPort');

/**
 * Adaptador Secundario: perfil público de la niñera en PostgreSQL (Neon) (HU12)
 * Requiere las migraciones 003_hu11_geolocalizacion.sql (columna anos_experiencia)
 * y 004_hu12_perfil_publico.sql
 *
 * Importante: las consultas NO traen DNI, correo ni celular (datos privados).
 */
class PostgresPerfilPublicoRepository extends PerfilPublicoRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async buscarNinera(idNinera) {
    const result = await this.pool.query(
      `SELECT u.id_usuario, u.nombre_usuario, u.apellido_usuario, u.foto_url, u.estado_cuenta,
              n.descripcion, n.anos_experiencia, n.habilidades, n.idiomas, n.distritos,
              n.tarifa_hora, n.zona, n.verificada
         FROM usuario u
         JOIN ninera n ON n.id_ninera = u.id_usuario
        WHERE u.id_usuario = $1
        LIMIT 1;`,
      [idNinera],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id_usuario,
      nombre: row.nombre_usuario,
      apellido: row.apellido_usuario,
      fotoUrl: row.foto_url,
      estadoCuenta: row.estado_cuenta,
      biografia: row.descripcion,
      aniosExperiencia: row.anos_experiencia,
      habilidades: row.habilidades || [],
      idiomas: row.idiomas || [],
      distritos: row.distritos || [],
      tarifaHora: row.tarifa_hora !== null ? Number(row.tarifa_hora) : null,
      zona: row.zona,
      verificada: row.verificada === true,
    };
  }

  async actualizarPerfil(idNinera, datos) {
    await this.pool.query(
      `UPDATE ninera
          SET descripcion = $2, anos_experiencia = $3, habilidades = $4, idiomas = $5, distritos = $6
        WHERE id_ninera = $1;`,
      [idNinera, datos.biografia, datos.aniosExperiencia, datos.habilidades, datos.idiomas, datos.distritos],
    );
  }

  async listarCertificadosAprobados(idNinera) {
    const result = await this.pool.query(
      `SELECT tipo, nombre, institucion, TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision
         FROM certificado
        WHERE id_ninera = $1
          AND estado_revision = 'APROBADO'
          AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE) -- solo vigentes
        ORDER BY fecha_emision DESC;`,
      [idNinera],
    );
    return result.rows.map((row) => ({
      tipo: row.tipo,
      nombre: row.nombre,
      institucion: row.institucion,
      fechaEmision: row.fecha_emision,
    }));
  }

  async obtenerReputacion(idNinera) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*)::int AS total, ROUND(AVG(calificacion)::numeric, 1) AS promedio
           FROM valoracion
          WHERE id_ninera = $1;`,
        [idNinera],
      );
      const row = result.rows[0];
      return { total: row.total, promedio: row.promedio !== null ? Number(row.promedio) : null };
    } catch (error) {
      // 42P01 = la tabla "valoracion" todavía no existe (llega con la HU18).
      if (error.code === '42P01') return { total: 0, promedio: null };
      throw error;
    }
  }

  async listarValoraciones(idNinera) {
    try {
      const result = await this.pool.query(
        `SELECT calificacion, comentario, TO_CHAR(fecha_valoracion, 'YYYY-MM-DD') AS fecha_valoracion
           FROM valoracion
          WHERE id_ninera = $1
          ORDER BY fecha_valoracion DESC, id_valoracion DESC;`,
        [idNinera],
      );
      return result.rows.map((row) => ({
        calificacion: Number(row.calificacion),
        comentario: row.comentario,
        fechaValoracion: row.fecha_valoracion,
      }));
    } catch (error) {
      // Una instalación que aún no aplicó HU18 conserva el perfil visible.
      if (error.code === '42P01') return [];
      throw error;
    }
  }
}

module.exports = PostgresPerfilPublicoRepository;
