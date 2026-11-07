/**
 * Servicio de Aplicación: ServicioMensajes
 * Implementa los Casos de Uso de Mensajería Interna (HU17).
 * Corresponde a 'ServicioMensajes' en el Diagrama de Secuencia Oficial (Figura 56).
 */

const { validarEnvioMensaje } = require('../../domain/validators/ValidadorMensaje');
const {
  ValidationError,
  ReservaNoPagadaError,
  UnauthorizedError,
} = require('../../domain/errors/DomainErrors');


class ServicioMensajes {
  /**
   * @param {Object} dependencias
   * @param {import('../ports/MensajeRepositoryPort')} dependencias.mensajeRepository
   * @param {import('../ports/RealtimeNotifierPort')} [dependencias.realtimeNotifier]
   * @param {import('../ports/NotificacionServicePort')} [dependencias.notificacionService]
   * @param {import('../ports/UserRepositoryPort')} [dependencias.userRepository]
   */
  constructor({
    mensajeRepository,
    realtimeNotifier = null,
    notificacionService = null,
    userRepository = null,
  }) {
    if (!mensajeRepository) {
      throw new Error('ServicioMensajes requiere un mensajeRepository.');
    }
    this.mensajeRepository = mensajeRepository;
    this.realtimeNotifier = realtimeNotifier;
    this.notificacionService = notificacionService;
    this.userRepository = userRepository;
  }

  /**
   * Enviar un mensaje entre usuarios (Figura 56: enviarMensaje(idEmisorPadre, idReceptorNinera, texto)).
   * Aplica la regla de negocio crítica: solo se puede conversar una vez pagada la tarifa / reserva confirmada.
   *
   * @param {number|string|Object} arg1 - idEmisor o payload { idEmisor, idReceptor, texto, omitirValidacionReserva }
   * @param {number|string} [arg2] - idReceptor
   * @param {string} [arg3] - texto
   */
  async enviarMensaje(arg1, arg2, arg3) {
    let idEmisor, idReceptor, texto, omitirValidacionReserva = false;

    if (typeof arg1 === 'object' && arg1 !== null) {
      idEmisor = arg1.idEmisor || arg1.idUsuarioEmisor || arg1.idEmisorPadre;
      idReceptor = arg1.idReceptor || arg1.idUsuarioReceptor || arg1.idReceptorNinera;
      texto = arg1.texto || arg1.contenido;
      omitirValidacionReserva = Boolean(arg1.omitirValidacionReserva);
    } else {
      idEmisor = arg1;
      idReceptor = arg2;
      texto = arg3;
    }

    // 1. Validación de Dominio
    const errores = validarEnvioMensaje({ idEmisor, idReceptor, contenido: texto });
    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Datos inválidos para enviar el mensaje.', errores);
    }

    const emisorId = Number(idEmisor);
    const receptorId = Number(idReceptor);

    // 2. Regla de Negocio: Verificar que la tarifa esté pagada (reserva confirmada/pagada)
    if (!omitirValidacionReserva) {
      const tienePermiso = await this.mensajeRepository.verificarReservaPagada(emisorId, receptorId);
      if (!tienePermiso) {
        throw new ReservaNoPagadaError(
          'No se puede iniciar la conversación: se requiere una reserva confirmada y pagada con la niñera.'
        );
      }
    }

    // 3. Persistencia en Base de Datos (Figura 56: INSERT INTO Mensaje)
    const nuevoMensaje = await this.mensajeRepository.crearMensaje({
      idEmisor: emisorId,
      idReceptor: receptorId,
      contenido: String(texto).trim(),
    });

    // 4. Crear Notificación (asíncrona en segundo plano para no demorar el envío del mensaje)
    if (this.notificacionService && typeof this.notificacionService.crearNotificacionMensaje === 'function') {
      Promise.resolve()
        .then(() =>
          this.notificacionService.crearNotificacionMensaje(
            receptorId,
            nuevoMensaje.id,
            nuevoMensaje.contenido
          )
        )
        .catch((err) => {
          console.warn('Aviso: no se pudo registrar la notificación de mensaje:', err.message);
        });
    }

    // 5. Emisión en Tiempo Real vía WebSockets (HU17)
    if (this.realtimeNotifier && typeof this.realtimeNotifier.emitirNuevoMensaje === 'function') {
      try {
        this.realtimeNotifier.emitirNuevoMensaje(receptorId, nuevoMensaje);
      } catch (err) {
        console.warn('Aviso: error al emitir por WebSockets:', err.message);
      }
    }

    return nuevoMensaje;
  }

  /**
   * Obtiene el historial de conversación entre dos usuarios y marca como leídos los recibidos.
   */
  async obtenerConversacion(idUsuarioActual, idOtroUsuario, { limite = 50, offset = 0 } = {}) {
    if (!idUsuarioActual) {
      throw new UnauthorizedError('Debes iniciar sesión para ver los mensajes.');
    }
    const usuarioActualId = Number(idUsuarioActual);
    const otroUsuarioId = Number(idOtroUsuario);

    if (!otroUsuarioId || usuarioActualId === otroUsuarioId) {
      throw new ValidationError('Identificador de contacto inválido.');
    }

    // Marcar como leídos los mensajes enviados por el otro usuario hacia mí
    await this.mensajeRepository.marcarMensajesComoLeidos(usuarioActualId, otroUsuarioId);

    // Notificar en tiempo real al emisor que sus mensajes fueron leídos
    if (this.realtimeNotifier && typeof this.realtimeNotifier.emitirMensajesLeidos === 'function') {
      try {
        this.realtimeNotifier.emitirMensajesLeidos(otroUsuarioId, {
          leidosPorId: usuarioActualId,
          fecha: new Date(),
        });
      } catch (err) {
        // Notificación en tiempo real silenciosa
      }
    }

    return this.mensajeRepository.obtenerMensajesEntreUsuarios(usuarioActualId, otroUsuarioId, {
      limite,
      offset,
    });
  }

  /**
   * Obtiene la lista de conversaciones activas con último mensaje y badge de no leídos.
   */
  async obtenerConversaciones(idUsuario) {
    if (!idUsuario) {
      throw new UnauthorizedError('Debes iniciar sesión para consultar conversaciones.');
    }
    return this.mensajeRepository.obtenerConversaciones(Number(idUsuario));
  }

  /**
   * Marcar como leídos los mensajes de un contacto.
   */
  async marcarLeido(idUsuarioActual, idContacto) {
    if (!idUsuarioActual) {
      throw new UnauthorizedError('Debes iniciar sesión.');
    }
    const usuarioActualId = Number(idUsuarioActual);
    const contactoId = Number(idContacto);

    const actualizados = await this.mensajeRepository.marcarMensajesComoLeidos(
      usuarioActualId,
      contactoId
    );

    if (this.realtimeNotifier && typeof this.realtimeNotifier.emitirMensajesLeidos === 'function') {
      try {
        this.realtimeNotifier.emitirMensajesLeidos(contactoId, {
          leidosPorId: usuarioActualId,
          fecha: new Date(),
        });
      } catch (err) {}
    }

    return { success: true, actualizados };
  }

  /**
   * Obtener información de perfil de un contacto de mensajería (para botón Ver Perfil).
   */
  async obtenerPerfilContacto(idContacto) {
    if (!idContacto) {
      throw new ValidationError('ID de contacto requerido.');
    }
    return this.mensajeRepository.obtenerPerfilContacto(Number(idContacto));
  }
}

module.exports = ServicioMensajes;
