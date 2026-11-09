const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');

const JwtTokenService = require('../src/infrastructure/adapters/security/JwtTokenService');
const SocketIoRealtimeNotifier = require('../src/infrastructure/adapters/realtime/SocketIoRealtimeNotifier');
const ServicioMensajes = require('../src/application/services/ServicioMensajes');
const ChatSocketController = require('../src/infrastructure/http/controllers/ChatSocketController');
const Mensaje = require('../src/domain/entities/Mensaje');
const MensajeRepositoryPort = require('../src/application/ports/MensajeRepositoryPort');

class RepositorioMockParaSocket extends MensajeRepositoryPort {
  constructor() {
    super();
    this.mensajes = [];
    this.siguienteId = 1;
  }
  async crearMensaje({ idEmisor, idReceptor, contenido }) {
    const msg = new Mensaje({
      id: this.siguienteId++,
      idUsuarioEmisor: idEmisor,
      idUsuarioReceptor: idReceptor,
      contenido,
      leido: false,
      fechaCreacion: new Date(),
    });
    this.mensajes.push(msg);
    return msg;
  }
  async verificarReservaPagada() {
    return true; // Reserva pagada confirmada para la prueba
  }
  async marcarMensajesComoLeidos(receptor, emisor) {
    let count = 0;
    for (const m of this.mensajes) {
      if (m.idUsuarioReceptor === receptor && m.idUsuarioEmisor === emisor) {
        m.marcarLeido();
        count++;
      }
    }
    return count;
  }
}

describe('Integración WebSockets (Socket.IO E2E en memoria)', () => {
  let server;
  let io;
  let port;
  let tokenService;
  let tokenPadre;
  let tokenNinera;
  let socketPadre;
  let socketNinera;

  const ID_PADRE = 101;
  const ID_NINERA = 202;

  before(async () => {
    tokenService = new JwtTokenService('test_secret_chat_2026');
    tokenPadre = tokenService.generateToken({ id: ID_PADRE, correo: 'padre@test.com', rol: 'FAMILIA' });
    tokenNinera = tokenService.generateToken({ id: ID_NINERA, correo: 'ninera@test.com', rol: 'NINERA' });

    server = http.createServer();
    io = new Server(server, { cors: { origin: '*' } });

    const repo = new RepositorioMockParaSocket();
    const notifier = new SocketIoRealtimeNotifier(io);
    const servicioMensajes = new ServicioMensajes({
      mensajeRepository: repo,
      realtimeNotifier: notifier,
    });

    new ChatSocketController({
      io,
      servicioMensajes,
      tokenService,
      realtimeNotifier: notifier,
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after((done) => {
    if (socketPadre) socketPadre.disconnect();
    if (socketNinera) socketNinera.disconnect();
    io.close(() => {
      server.close(done);
    });
  });

  test('conecta ambos usuarios por WebSockets con autenticación JWT', async () => {
    socketPadre = ioClient(`http://localhost:${port}`, {
      auth: { token: tokenPadre },
      transports: ['websocket'],
    });

    socketNinera = ioClient(`http://localhost:${port}`, {
      auth: { token: tokenNinera },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => socketPadre.on('connect', resolve)),
      new Promise((resolve) => socketNinera.on('connect', resolve)),
    ]);

    assert.ok(socketPadre.connected);
    assert.ok(socketNinera.connected);
  });

  test('transmite mensaje en tiempo real del Padre a la Niñera vía chat:enviar_mensaje', async () => {
    const textoMensaje = '¡Hola María! Confirmamos la reserva para el lunes a las 8 AM.';

    const promesaRecepcion = new Promise((resolve) => {
      socketNinera.once('chat:nuevo_mensaje', (msg) => {
        resolve(msg);
      });
    });

    // Padre envía mensaje por WebSocket con callback ACK
    const ackRespuesta = await new Promise((resolve) => {
      socketPadre.emit(
        'chat:enviar_mensaje',
        {
          idReceptor: ID_NINERA,
          contenido: textoMensaje,
        },
        resolve
      );
    });

    assert.equal(ackRespuesta.success, true);
    assert.equal(ackRespuesta.data.contenido, textoMensaje);

    // Niñera debe recibir el evento chat:nuevo_mensaje de inmediato
    const mensajeRecibido = await promesaRecepcion;
    assert.equal(mensajeRecibido.contenido, textoMensaje);
    assert.equal(mensajeRecibido.idUsuarioEmisor, ID_PADRE);
    assert.equal(mensajeRecibido.idUsuarioReceptor, ID_NINERA);
  });

  test('notifica confirmación de lectura en tiempo real al emisor', async () => {
    const promesaLectura = new Promise((resolve) => {
      socketPadre.once('chat:mensajes_leidos', (datos) => {
        resolve(datos);
      });
    });

    // Niñera marca la conversación como leída
    socketNinera.emit('chat:marcar_leido', { idContacto: ID_PADRE });

    const datosLectura = await promesaLectura;
    assert.equal(datosLectura.leidosPorId, ID_NINERA);
  });
});
