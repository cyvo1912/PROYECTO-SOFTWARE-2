const responderError = require('../responderError');

/**
 * Adaptador Primario: MensajeriaController (HTTP REST)
 * Endpoints complementarios para carga inicial y sincronización de mensajes (HU17).
 */
class MensajeriaController {
  constructor(servicioMensajes, realtimeNotifier = null) {
    if (!servicioMensajes) throw new Error('servicioMensajes es requerido en MensajeriaController');
    this.servicioMensajes = servicioMensajes;
    this.realtimeNotifier = realtimeNotifier;
  }

  /**
   * GET /api/mensajeria/conversaciones
   * Retorna las conversaciones del usuario autenticado con último mensaje y badge de no leídos.
   */
  async listarConversaciones(req, res) {
    try {
      const conversaciones = await this.servicioMensajes.obtenerConversaciones(req.user.id);
      
      // Enriquecer con estado en línea si el realtimeNotifier está activo
      const conversacionesConEstado = conversaciones.map((c) => ({
        ...c,
        enLinea: this.realtimeNotifier ? this.realtimeNotifier.estaEnLinea(c.idContacto) : false,
      }));

      return res.status(200).json({
        success: true,
        data: conversacionesConEstado,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * GET /api/mensajeria/conversacion/:idContacto
   * Retorna el historial de mensajes con un contacto y marca los mensajes como leídos.
   */
  async obtenerHistorial(req, res) {
    try {
      const limite = Number(req.query.limite) || 50;
      const offset = Number(req.query.offset) || 0;
      const mensajes = await this.servicioMensajes.obtenerConversacion(
        req.user.id,
        req.params.idContacto,
        { limite, offset }
      );

      return res.status(200).json({
        success: true,
        data: mensajes,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * POST /api/mensajeria/enviar
   * Envía un mensaje (Figura 56: enviarMensaje)
   */
  async enviarMensaje(req, res) {
    try {
      const idReceptor = req.body.idReceptor || req.body.id_receptor;
      const contenido = req.body.contenido || req.body.texto;
      const mensaje = await this.servicioMensajes.enviarMensaje({
        idEmisor: req.user.id,
        idReceptor,
        texto: contenido,
      });

      return res.status(201).json({
        success: true,
        message: 'Mensaje enviado correctamente.',
        data: mensaje,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * PUT /api/mensajeria/leer/:idContacto
   * Marca mensajes de un contacto como leídos.
   */
  async marcarComoLeido(req, res) {
    try {
      const resultado = await this.servicioMensajes.marcarLeido(req.user.id, req.params.idContacto);
      return res.status(200).json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /**
   * GET /api/mensajeria/contacto/:idContacto
   * Retorna información de perfil de un contacto para el chat (botón Ver Perfil).
   */
  async obtenerPerfilContacto(req, res) {
    try {
      const perfil = await this.servicioMensajes.obtenerPerfilContacto(req.params.idContacto);
      if (!perfil) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado.',
        });
      }
      return res.status(200).json({
        success: true,
        data: perfil,
      });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = MensajeriaController;
