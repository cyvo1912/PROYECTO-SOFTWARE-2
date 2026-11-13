const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioMensajes = require('../src/application/services/ServicioMensajes');
const Mensaje = require('../src/domain/entities/Mensaje');
const MensajeRepositoryPort = require('../src/application/ports/MensajeRepositoryPort');
const RealtimeNotifierPort = require('../src/application/ports/RealtimeNotifierPort');
const NotificacionServicePort = require('../src/application/ports/NotificacionServicePort');
const {
  ValidationError,
  ReservaNoPagadaError,
  UnauthorizedError,
} = require('../src/domain/errors/DomainErrors');

/**
 * Repositorio de Mensajes en memoria para pruebas unitarias aisladas (SOLID LSP / DIP).
 */
class MensajeRepositoryEnMemoria extends MensajeRepositoryPort {
  constructor() {
    super();
    this.mensajes = [];
    this.siguienteId = 1;
    // Set de claves `${padreId}_${nineraId}` con reserva pagada
    this.reservasPagadas = new Set();
    this.admins = new Set();
  }

  agregarReservaPagada(idPadre, idNinera) {
    this.reservasPagadas.add(`${idPadre}_${idNinera}`);
    this.reservasPagadas.add(`${idNinera}_${idPadre}`);
  }

  agregarAdmin(idUsuario) {
    this.admins.add(Number(idUsuario));
  }

  async crearMensaje({ idEmisor, idReceptor, contenido }) {
    const nuevo = new Mensaje({
      id: this.siguienteId++,
      idUsuarioEmisor: idEmisor,
      idUsuarioReceptor: idReceptor,
      contenido,
      leido: false,
      fechaCreacion: new Date(),
    });
    this.mensajes.push(nuevo);
    return nuevo;
  }

  async obtenerMensajesEntreUsuarios(idUsuarioA, idUsuarioB) {
    const a = Number(idUsuarioA);
    const b = Number(idUsuarioB);
    return this.mensajes.filter(
      (m) =>
        (m.idUsuarioEmisor === a && m.idUsuarioReceptor === b) ||
        (m.idUsuarioEmisor === b && m.idUsuarioReceptor === a)
    );
  }

  async obtenerConversaciones(idUsuario) {
    const uid = Number(idUsuario);
    const contactos = new Map();

    for (const m of this.mensajes) {
      if (m.idUsuarioEmisor === uid || m.idUsuarioReceptor === uid) {
        const idContacto = m.idUsuarioEmisor === uid ? m.idUsuarioReceptor : m.idUsuarioEmisor;
        if (!contactos.has(idContacto)) {
          contactos.set(idContacto, {
            idContacto,
            nombre: `Usuario ${idContacto}`,
            ultimoMensaje: m.contenido,
            ultimaFecha: m.fechaCreacion,
            noLeidos: 0,
            enLinea: false,
          });
        } else {
          const c = contactos.get(idContacto);
          c.ultimoMensaje = m.contenido;
          c.ultimaFecha = m.fechaCreacion;
        }
        if (m.idUsuarioReceptor === uid && !m.leido) {
          contactos.get(idContacto).noLeidos++;
        }
      }
    }
    return Array.from(contactos.values());
  }

  async marcarMensajesComoLeidos(idUsuarioReceptor, idUsuarioEmisor) {
    const receptor = Number(idUsuarioReceptor);
    const emisor = Number(idUsuarioEmisor);
    let count = 0;
    for (const m of this.mensajes) {
      if (m.idUsuarioReceptor === receptor && m.idUsuarioEmisor === emisor && !m.leido) {
        m.marcarLeido();
        count++;
      }
    }
    return count;
  }

  async contarMensajesNoLeidos(idUsuario) {
    const uid = Number(idUsuario);
    return this.mensajes.filter((m) => m.idUsuarioReceptor === uid && !m.leido).length;
  }

  async verificarReservaPagada(idUsuarioA, idUsuarioB) {
    const a = Number(idUsuarioA);
    const b = Number(idUsuarioB);
    if (this.admins.has(a) || this.admins.has(b)) return true;
    return this.reservasPagadas.has(`${a}_${b}`);
  }
}

/**
 * Notificador en memoria para registrar emisiones de eventos.
 */
class RealtimeNotifierEnMemoria extends RealtimeNotifierPort {
  constructor() {
    super();
    this.emisionesMensaje = [];
    this.emisionesLectura = [];
  }

  emitirNuevoMensaje(idReceptor, mensaje) {
    this.emisionesMensaje.push({ idReceptor, mensaje });
  }

  emitirMensajesLeidos(idEmisor, datosLectura) {
    this.emisionesLectura.push({ idEmisor, datosLectura });
  }

  emitirEstadoUsuario() {}
}

/**
 * Mock de Notificaciones según Figura 56.
 */
class NotificacionServiceEnMemoria extends NotificacionServicePort {
  constructor() {
    super();
    this.notificacionesCreadas = [];
  }

  async crearNotificacionMensaje(idReceptor, idMensaje, texto) {
    this.notificacionesCreadas.push({ idReceptor, idMensaje, texto });
  }
}

describe('ServicioMensajes (HU17 - Comunicación en Tiempo Real)', () => {
  let repo;
  let notifier;
  let notificaciones;
  let servicio;

  const ID_PADRE = 10;
  const ID_NINERA = 20;
  const ID_ADMIN = 99;

  beforeEach(() => {
    repo = new MensajeRepositoryEnMemoria();
    notifier = new RealtimeNotifierEnMemoria();
    notificaciones = new NotificacionServiceEnMemoria();
    servicio = new ServicioMensajes({
      mensajeRepository: repo,
      realtimeNotifier: notifier,
      notificacionService: notificaciones,
    });
  });

  test('permite enviar un mensaje cuando la reserva está confirmada y pagada', async () => {
    repo.agregarReservaPagada(ID_PADRE, ID_NINERA);

    const mensaje = await servicio.enviarMensaje({
      idEmisor: ID_PADRE,
      idReceptor: ID_NINERA,
      texto: 'Hola María, nos vemos el lunes a las 8 AM.',
    });

    assert.ok(mensaje.id);
    assert.equal(mensaje.contenido, 'Hola María, nos vemos el lunes a las 8 AM.');
    assert.equal(mensaje.idUsuarioEmisor, ID_PADRE);
    assert.equal(mensaje.idUsuarioReceptor, ID_NINERA);
    assert.equal(mensaje.leido, false);

    // Verificación de WebSockets y Notificaciones
    assert.equal(notifier.emisionesMensaje.length, 1);
    assert.equal(notifier.emisionesMensaje[0].idReceptor, ID_NINERA);
    assert.equal(notificaciones.notificacionesCreadas.length, 1);
  });

  test('rechaza el envío con ReservaNoPagadaError si la tarifa aún no ha sido pagada', async () => {
    // No agregamos reserva pagada entre ID_PADRE e ID_NINERA
    await assert.rejects(
      () =>
        servicio.enviarMensaje({
          idEmisor: ID_PADRE,
          idReceptor: ID_NINERA,
          texto: '¿Podemos conversar antes de pagar?',
        }),
      (err) => {
        assert.ok(err instanceof ReservaNoPagadaError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /se requiere una reserva confirmada y pagada/i);
        return true;
      }
    );

    // No debe haberse guardado ningún mensaje
    assert.equal(repo.mensajes.length, 0);
  });

  test('permite el envío directo si uno de los usuarios es un Administrador', async () => {
    repo.agregarAdmin(ID_ADMIN);

    const mensaje = await servicio.enviarMensaje({
      idEmisor: ID_ADMIN,
      idReceptor: ID_NINERA,
      texto: 'Aviso administrativo: tu perfil ha sido verificado con éxito.',
    });

    assert.ok(mensaje.id);
    assert.equal(mensaje.idUsuarioEmisor, ID_ADMIN);
  });

  test('rechaza el mensaje con ValidationError si el texto está vacío', async () => {
    repo.agregarReservaPagada(ID_PADRE, ID_NINERA);

    await assert.rejects(
      () =>
        servicio.enviarMensaje({
          idEmisor: ID_PADRE,
          idReceptor: ID_NINERA,
          texto: '   ',
        }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.fields.contenido, 'El mensaje no puede estar vacío.');
        return true;
      }
    );
  });

  test('rechaza enviarse un mensaje a sí mismo', async () => {
    await assert.rejects(
      () =>
        servicio.enviarMensaje({
          idEmisor: ID_PADRE,
          idReceptor: ID_PADRE,
          texto: 'Mensaje a mí mismo',
        }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.fields.idReceptor, 'No es posible enviarse un mensaje a sí mismo.');
        return true;
      }
    );
  });

  test('obtenerConversacion recupera el historial y marca como leídos los mensajes', async () => {
    repo.agregarReservaPagada(ID_PADRE, ID_NINERA);

    // Niñera envía 2 mensajes al Padre
    await servicio.enviarMensaje({ idEmisor: ID_NINERA, idReceptor: ID_PADRE, texto: 'Hola!' });
    await servicio.enviarMensaje({ idEmisor: ID_NINERA, idReceptor: ID_PADRE, texto: '¿Qué edad tiene el niño?' });

    // Verificar que antes de leer están no leídos
    assert.equal(await repo.contarMensajesNoLeidos(ID_PADRE), 2);

    // Padre abre la conversación
    const historial = await servicio.obtenerConversacion(ID_PADRE, ID_NINERA);
    assert.equal(historial.length, 2);

    // Ahora deben estar marcados como leídos
    assert.equal(await repo.contarMensajesNoLeidos(ID_PADRE), 0);
    assert.equal(notifier.emisionesLectura.length, 1);
    assert.equal(notifier.emisionesLectura[0].idEmisor, ID_NINERA);
  });

  test('obtenerConversaciones calcula correctamente el conteo de no leídos', async () => {
    repo.agregarReservaPagada(ID_PADRE, ID_NINERA);

    await servicio.enviarMensaje({ idEmisor: ID_NINERA, idReceptor: ID_PADRE, texto: 'Mensaje 1' });
    await servicio.enviarMensaje({ idEmisor: ID_NINERA, idReceptor: ID_PADRE, texto: 'Mensaje 2' });

    const conversaciones = await servicio.obtenerConversaciones(ID_PADRE);
    assert.equal(conversaciones.length, 1);
    assert.equal(conversaciones[0].idContacto, ID_NINERA);
    assert.equal(conversaciones[0].noLeidos, 2);
    assert.equal(conversaciones[0].ultimoMensaje, 'Mensaje 2');
  });

  test('exige sesión iniciada para consultar conversaciones', async () => {
    await assert.rejects(
      () => servicio.obtenerConversaciones(null),
      (err) => err instanceof UnauthorizedError
    );
  });
});
