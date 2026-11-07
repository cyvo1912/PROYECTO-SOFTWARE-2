const MensajeRepositoryPort = require('../../../application/ports/MensajeRepositoryPort');
const Mensaje = require('../../../domain/entities/Mensaje');

/**
 * Adaptador Secundario: Repositorio de Mensajes en PostgreSQL (Neon)
 * Implementa MensajeRepositoryPort respetando la Arquitectura Hexagonal.
 */
class PostgresMensajeRepository extends MensajeRepositoryPort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async crearMensaje({ idEmisor, idReceptor, contenido }) {
    const result = await this.pool.query(
      `INSERT INTO mensaje (id_usuario_emisor, id_usuario_receptor, contenido, leido, fecha_creacion)
       VALUES ($1, $2, $3, false, (NOW() AT TIME ZONE 'America/Lima'))
       RETURNING id_mensaje, id_usuario_emisor, id_usuario_receptor, contenido, leido, fecha_creacion, fecha_lectura;`,
      [Number(idEmisor), Number(idReceptor), contenido]
    );

    return filaAMensaje(result.rows[0]);
  }

  async obtenerMensajesEntreUsuarios(idUsuarioA, idUsuarioB, { limite = 50, offset = 0 } = {}) {
    const userA = Number(idUsuarioA);
    const userB = Number(idUsuarioB);

    const result = await this.pool.query(
      `SELECT m.id_mensaje, m.id_usuario_emisor, m.id_usuario_receptor, m.contenido,
              m.leido, m.fecha_creacion, m.fecha_lectura,
              u.nombre_usuario AS nombre_emisor,
              u.apellido_usuario AS apellido_emisor,
              u.tipo_usuario AS rol_emisor
       FROM mensaje m
       JOIN usuario u ON u.id_usuario = m.id_usuario_emisor
       WHERE (m.id_usuario_emisor = $1 AND m.id_usuario_receptor = $2)
          OR (m.id_usuario_emisor = $2 AND m.id_usuario_receptor = $1)
       ORDER BY m.fecha_creacion ASC
       LIMIT $3 OFFSET $4;`,
      [userA, userB, limite, offset]
    );

    return result.rows.map((row) => {
      const mensaje = filaAMensaje(row);
      mensaje.nombreEmisor = `${row.nombre_emisor} ${row.apellido_emisor || ''}`.trim();
      mensaje.rolEmisor = row.rol_emisor;
      return mensaje;
    });

  }

  async obtenerConversaciones(idUsuario) {
    const userId = Number(idUsuario);

    const query = `
      WITH ultimos AS (
        SELECT 
          CASE WHEN id_usuario_emisor = $1 THEN id_usuario_receptor ELSE id_usuario_emisor END AS contacto_id,
          MAX(id_mensaje) AS max_id
        FROM mensaje
        WHERE id_usuario_emisor = $1 OR id_usuario_receptor = $1
        GROUP BY contacto_id
      ),
      no_leidos AS (
        SELECT id_usuario_emisor AS contacto_id, COUNT(*) AS sin_leer
        FROM mensaje
        WHERE id_usuario_receptor = $1 AND leido = false
        GROUP BY id_usuario_emisor
      )
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.apellido_usuario,
        u.tipo_usuario,
        u.correo,
        u.celular,
        u.foto_url,
        n.tarifa_hora,
        n.zona,
        n.experiencia,
        n.descripcion AS bio_ninera,
        p.nombre_familia,
        p.direccion,
        p.numero_ninos,
        m.id_mensaje,
        m.contenido AS ultimo_mensaje,
        m.fecha_creacion AS ultima_fecha,
        COALESCE(nl.sin_leer, 0)::int AS no_leidos
      FROM ultimos ul
      JOIN mensaje m ON m.id_mensaje = ul.max_id
      JOIN usuario u ON u.id_usuario = ul.contacto_id
      LEFT JOIN ninera n ON n.id_ninera = u.id_usuario
      LEFT JOIN padre p ON p.id_padre = u.id_usuario
      LEFT JOIN no_leidos nl ON nl.contacto_id = ul.contacto_id
      ORDER BY m.fecha_creacion DESC;
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map((r) => ({
      idContacto: r.id_usuario,
      nombre: `${r.nombre_usuario} ${r.apellido_usuario || ''}`.trim(),
      tipoUsuario: r.tipo_usuario,
      correo: r.correo,
      celular: r.celular,
      fotoUrl: r.foto_url,
      tarifaHora: r.tarifa_hora,
      zona: r.zona,
      experiencia: r.experiencia,
      bio: r.bio_ninera,
      nombreFamilia: r.nombre_familia,
      direccion: r.direccion,
      numeroNinos: r.numero_ninos,
      ultimoMensaje: r.ultimo_mensaje,
      ultimaFecha: r.ultima_fecha,
      noLeidos: r.no_leidos,
      enLinea: false, // Enriquecido por el notifier en memoria si está conectado
    }));
  }

  async marcarMensajesComoLeidos(idUsuarioReceptor, idUsuarioEmisor) {
    const result = await this.pool.query(
      `UPDATE mensaje
       SET leido = true, fecha_lectura = (NOW() AT TIME ZONE 'America/Lima')
       WHERE id_usuario_receptor = $1 AND id_usuario_emisor = $2 AND leido = false;`,
      [Number(idUsuarioReceptor), Number(idUsuarioEmisor)]
    );
    return result.rowCount;
  }

  async contarMensajesNoLeidos(idUsuario) {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM mensaje WHERE id_usuario_receptor = $1 AND leido = false;`,
      [Number(idUsuario)]
    );
    return result.rows[0]?.total || 0;
  }

  /**
   * Valida regla de negocio: ¿Existe reserva pagada/confirmada entre padre y niñera?
   * Optimizado: Consulta combinada única para reducir latencia de red.
   */
  async verificarReservaPagada(idUsuarioA, idUsuarioB) {
    const userA = Number(idUsuarioA);
    const userB = Number(idUsuarioB);

    const result = await this.pool.query(
      `SELECT 1 FROM usuario WHERE id_usuario IN ($1, $2) AND tipo_usuario = 'ADMIN'
       UNION ALL
       SELECT 1 FROM reserva
       WHERE (
         (id_padre = $1 AND id_ninera = $2)
         OR (id_padre = $2 AND id_ninera = $1)
       )
       AND LOWER(estado_reserva) IN ('pagada', 'confirmada', 'aceptada', 'completada')
       LIMIT 1;`,
      [userA, userB]
    );

    return result.rows.length > 0;
  }

  async obtenerPerfilContacto(idContacto) {
    const contactId = Number(idContacto);
    const query = `
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.apellido_usuario,
        u.tipo_usuario,
        u.correo,
        u.celular,
        u.foto_url,
        n.tarifa_hora,
        n.zona,
        n.experiencia,
        n.descripcion AS bio_ninera,
        p.nombre_familia,
        p.direccion,
        p.numero_ninos,
        p.edades_ninos,
        p.informacion_adicional
      FROM usuario u
      LEFT JOIN ninera n ON n.id_ninera = u.id_usuario
      LEFT JOIN padre p ON p.id_padre = u.id_usuario
      WHERE u.id_usuario = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [contactId]);
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    return {
      idContacto: r.id_usuario,
      nombre: `${r.nombre_usuario} ${r.apellido_usuario || ''}`.trim(),
      tipoUsuario: r.tipo_usuario,
      correo: r.correo,
      celular: r.celular,
      fotoUrl: r.foto_url,
      tarifaHora: r.tarifa_hora,
      zona: r.zona,
      experiencia: r.experiencia,
      bio: r.bio_ninera,
      nombreFamilia: r.nombre_familia,
      direccion: r.direccion,
      numeroNinos: r.numero_ninos,
      edadesNinos: r.edades_ninos,
      informacionAdicional: r.informacion_adicional,
    };
  }
}

function filaAMensaje(row) {
  if (!row) return null;
  return new Mensaje({
    id: row.id_mensaje,
    idUsuarioEmisor: row.id_usuario_emisor,
    idUsuarioReceptor: row.id_usuario_receptor,
    contenido: row.contenido,
    leido: row.leido,
    fechaCreacion: row.fecha_creacion,
    fechaLectura: row.fecha_lectura,
  });
}

module.exports = PostgresMensajeRepository;
