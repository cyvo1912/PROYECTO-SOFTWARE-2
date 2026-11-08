const RealtimeNotifierPort = require('../../../application/ports/RealtimeNotifierPort');

/**
 * Adaptador Secundario: Notificador en Tiempo Real con Socket.IO
 * Implementa RealtimeNotifierPort (Patrón Adapter) para encapsular la librería externa.
 */
class SocketIoRealtimeNotifier extends RealtimeNotifierPort {
  /**
   * @param {import('socket.io').Server} [io]
   */
  constructor(io = null) {
    super();
    this.io = io;
    // Registro en memoria de usuarios conectados: Map<idUsuario, Set<socketId>>
    this.usuariosConectados = new Map();
  }

  setIo(io) {
    this.io = io;
  }

  registrarConexion(idUsuario, socketId) {
    const userId = Number(idUsuario);
    if (!this.usuariosConectados.has(userId)) {
      this.usuariosConectados.set(userId, new Set());
    }
    this.usuariosConectados.get(userId).add(socketId);
    this.emitirEstadoUsuario(userId, true);
  }

  registrarDesconexion(idUsuario, socketId) {
    const userId = Number(idUsuario);
    if (this.usuariosConectados.has(userId)) {
      const sockets = this.usuariosConectados.get(userId);
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.usuariosConectados.delete(userId);
        this.emitirEstadoUsuario(userId, false);
      }
    }
  }

  estaEnLinea(idUsuario) {
    const userId = Number(idUsuario);
    return this.usuariosConectados.has(userId) && this.usuariosConectados.get(userId).size > 0;
  }

  emitirNuevoMensaje(idReceptor, mensaje) {
    if (!this.io) return;
    const receptorId = Number(idReceptor);
    this.io.to(`user_${receptorId}`).emit('chat:nuevo_mensaje', mensaje);
  }

  emitirMensajesLeidos(idEmisor, datosLectura) {
    if (!this.io) return;
    const emisorId = Number(idEmisor);
    this.io.to(`user_${emisorId}`).emit('chat:mensajes_leidos', datosLectura);
  }

  emitirEstadoUsuario(idUsuario, enLinea) {
    if (!this.io) return;
    this.io.emit('chat:usuario_estado', {
      usuarioId: Number(idUsuario),
      enLinea: Boolean(enLinea),
    });
  }
}

module.exports = SocketIoRealtimeNotifier;
