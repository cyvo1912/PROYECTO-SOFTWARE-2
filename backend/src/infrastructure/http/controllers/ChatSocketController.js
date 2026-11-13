/**
 * Adaptador Primario: ChatSocketController
 * Maneja eventos en tiempo real mediante WebSockets (Socket.IO).
 * HU17 - Comunicación en Tiempo Real.
 */
class ChatSocketController {
  constructor({ io, servicioMensajes, tokenService, realtimeNotifier }) {
    this.io = io;
    this.servicioMensajes = servicioMensajes;
    this.tokenService = tokenService;
    this.realtimeNotifier = realtimeNotifier;

    this._configurarAuth();
    this._configurarEventos();
  }

  _configurarAuth() {
    this.io.use((socket, next) => {
      try {
        const rawToken =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization;

        if (!rawToken) {
          return next(new Error('Token de autenticación requerido para el chat.'));
        }

        const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
        const decoded = typeof this.tokenService.verifyToken === 'function'
          ? this.tokenService.verifyToken(token)
          : this.tokenService.verificarToken(token);
        socket.user = decoded;
        socket.userId = Number(decoded.id);
        next();

      } catch (err) {
        next(new Error('Token inválido para WebSockets: ' + err.message));
      }
    });
  }

  _configurarEventos() {
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      const userRoom = `user_${userId}`;

      // Unir socket a su sala privada por idUsuario
      socket.join(userRoom);

      if (this.realtimeNotifier) {
        this.realtimeNotifier.registrarConexion(userId, socket.id);
      }

      // Evento: Enviar mensaje en tiempo real (Figura 56: enviarMensaje)
      socket.on('chat:enviar_mensaje', async (payload, callback) => {
        try {
          const { idReceptor, contenido } = payload || {};
          const mensaje = await this.servicioMensajes.enviarMensaje({
            idEmisor: userId,
            idReceptor,
            texto: contenido,
          });

          if (typeof callback === 'function') {
            callback({ success: true, data: mensaje });
          }
        } catch (error) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              message: error.message || 'Error al enviar mensaje.',
              fields: error.fields || undefined,
              name: error.name,
            });
          }
        }
      });

      // Evento: Marcar mensajes de un contacto como leídos
      socket.on('chat:marcar_leido', async (payload) => {
        try {
          const { idContacto } = payload || {};
          if (idContacto) {
            await this.servicioMensajes.marcarLeido(userId, idContacto);
          }
        } catch (err) {
          // Fallo silencioso en lectura en tiempo real
        }
      });

      // Evento: Indicador "Escribiendo..."
      socket.on('chat:escribiendo', (payload) => {
        const { idReceptor, estaEscribiendo } = payload || {};
        if (idReceptor) {
          socket.to(`user_${Number(idReceptor)}`).emit('chat:escribiendo', {
            idUsuario: userId,
            estaEscribiendo: Boolean(estaEscribiendo),
          });
        }
      });

      // Desconexión
      socket.on('disconnect', () => {
        if (this.realtimeNotifier) {
          this.realtimeNotifier.registrarDesconexion(userId, socket.id);
        }
      });
    });
  }
}

module.exports = ChatSocketController;
