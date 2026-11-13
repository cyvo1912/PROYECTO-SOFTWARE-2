const NotificacionServicePort = require('../../../application/ports/NotificacionServicePort');

/**
 * Adaptador Secundario: Registro de Notificaciones en PostgreSQL
 * Cumple con el flujo de la Figura 56: crearNotificacionMensaje(idReceptor, idMensaje)
 */
class PostgresNotificacionService extends NotificacionServicePort {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async crearNotificacionMensaje(idReceptor, idMensaje, texto) {
    try {
      const resumen = texto.length > 50 ? `${texto.substring(0, 47)}...` : texto;
      await this.pool.query(
        `INSERT INTO notificacion (id_usuario, tipo_notificacion, titulo, mensaje, leido, fecha_envio)
         VALUES ($1, 'Mensaje', 'Nuevo mensaje recibido', $2, false, (NOW() AT TIME ZONE 'America/Lima'))`,
        [Number(idReceptor), resumen]
      );
    } catch (err) {
      // Si la tabla notificacion aún no está creada en ciertos entornos, se captura de forma segura
      console.warn('PostgresNotificacionService warning:', err.message);
    }
  }

  async crearNotificacionReserva(idReceptor, texto) {
    try {
      await this.pool.query(
        `INSERT INTO notificacion (id_usuario, tipo_notificacion, titulo, mensaje, leido, fecha_envio)
         VALUES ($1, 'Reserva', 'Actualización de reserva', $2, false, (NOW() AT TIME ZONE 'America/Lima'))`,
        [Number(idReceptor), String(texto).slice(0, 500)],
      );
    } catch (err) {
      console.warn('PostgresNotificacionService warning:', err.message);
    }
  }
}

module.exports = PostgresNotificacionService;
