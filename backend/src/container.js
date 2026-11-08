const pool = require('./config/db');
const PostgresUserRepository = require('./infrastructure/adapters/db/PostgresUserRepository');
const PrismaUserRepository = require('./infrastructure/adapters/db/PrismaUserRepository');
const PostgresHijoRepository = require('./infrastructure/adapters/db/PostgresHijoRepository');
const PrismaHijoRepository = require('./infrastructure/adapters/db/PrismaHijoRepository');
const BcryptPasswordHasher = require('./infrastructure/adapters/security/BcryptPasswordHasher');
const JwtTokenService = require('./infrastructure/adapters/security/JwtTokenService');
const PostgresMultimediaRepository = require('./infrastructure/adapters/db/PostgresMultimediaRepository');
const CloudinaryAlmacenamiento = require('./infrastructure/adapters/storage/CloudinaryAlmacenamiento');
const ServicioAuth = require('./application/services/ServicioAuth');
const ServicioRegistro = require('./application/services/ServicioRegistro');
const ServicioUsuario = require('./application/services/ServicioUsuario');
const ServicioHijo = require('./application/services/ServicioHijo');
const ServicioMultimedia = require('./application/services/ServicioMultimedia');
const ServicioBusqueda = require('./application/services/ServicioBusqueda');
const AuthController = require('./infrastructure/http/controllers/AuthController');
const UsuarioController = require('./infrastructure/http/controllers/UsuarioController');
const HijoController = require('./infrastructure/http/controllers/HijoController');
const MultimediaController = require('./infrastructure/http/controllers/MultimediaController');
const BusquedaController = require('./infrastructure/http/controllers/BusquedaController');
const PostgresAdministradorRepository = require('./infrastructure/adapters/db/PostgresAdministradorRepository');
const ServicioAdministrador = require('./application/services/ServicioAdministrador');
const AdministradorController = require('./infrastructure/http/controllers/AdministradorController');
const PostgresPerfilPublicoRepository = require('./infrastructure/adapters/db/PostgresPerfilPublicoRepository');
const ServicioPerfilPublico = require('./application/services/ServicioPerfilPublico');
const PerfilPublicoController = require('./infrastructure/http/controllers/PerfilPublicoController');
const PostgresDisponibilidadRepository = require('./infrastructure/adapters/db/PostgresDisponibilidadRepository');
const { EstrategiaDisponibilidadRangoFechas } = require('./domain/strategies/EstrategiaCalculoDisponibilidad');
const ServicioDisponibilidad = require('./application/services/ServicioDisponibilidad');
const DisponibilidadController = require('./infrastructure/http/controllers/DisponibilidadController');
const crearAuthMiddleware = require('./infrastructure/http/middlewares/authMiddleware');

// HU17 - Mensajería en Tiempo Real (Gabriel)
const PostgresMensajeRepository = require('./infrastructure/adapters/db/PostgresMensajeRepository');
const SocketIoRealtimeNotifier = require('./infrastructure/adapters/realtime/SocketIoRealtimeNotifier');
const PostgresNotificacionService = require('./infrastructure/adapters/db/PostgresNotificacionService');
const ServicioMensajes = require('./application/services/ServicioMensajes');
const MensajeriaController = require('./infrastructure/http/controllers/MensajeriaController');
const ChatSocketController = require('./infrastructure/http/controllers/ChatSocketController');


class Container {
  constructor(options = {}) {
    // Selección de estrategia de persistencia (SOLID DIP)
    const usePrisma = options.usePrisma || process.env.USE_PRISMA === 'true';
    if (usePrisma) {
      let prismaClient = null;
      try {
        const { PrismaClient } = require('@prisma/client');
        prismaClient = new PrismaClient();
      } catch (e) {
        // Fallback seguro si la librería del cliente aún no se ha generado
      }
      this.userRepository = new PrismaUserRepository(prismaClient);
      this.hijoRepository = new PrismaHijoRepository(prismaClient);
    } else {
      this.userRepository = new PostgresUserRepository(pool);
      this.hijoRepository = new PostgresHijoRepository(pool);
    }

    // Adaptadores Secundarios (Seguridad / Tokens)
    this.passwordHasher = new BcryptPasswordHasher();
    this.tokenService = new JwtTokenService();
    this.multimediaRepository = new PostgresMultimediaRepository(pool);
    this.administradorRepository = new PostgresAdministradorRepository(pool);
    this.disponibilidadRepository = new PostgresDisponibilidadRepository(pool);
    this.estrategiaCalculoDisponibilidad = new EstrategiaDisponibilidadRangoFechas();
    this.almacenamiento = new CloudinaryAlmacenamiento();
    this.perfilPublicoRepository = new PostgresPerfilPublicoRepository(pool); // HU12

    // HU17: Adaptadores Secundarios de Mensajería
    this.mensajeRepository = new PostgresMensajeRepository(pool);
    this.realtimeNotifier = new SocketIoRealtimeNotifier();
    this.notificacionService = new PostgresNotificacionService(pool);

    // Servicios de Aplicación (Núcleo de Negocio UML)
    this.servicioAuth = new ServicioAuth({
      userRepository: this.userRepository,
      passwordHasher: this.passwordHasher,
      tokenService: this.tokenService,
    });
    this.servicioRegistro = new ServicioRegistro({
      userRepository: this.userRepository,
      passwordHasher: this.passwordHasher,
      tokenService: this.tokenService,
    });
    this.servicioUsuario = new ServicioUsuario({
      userRepository: this.userRepository,
    });
    this.servicioHijo = new ServicioHijo({
      hijoRepository: this.hijoRepository,
    });
    this.servicioMultimedia = new ServicioMultimedia({
      multimediaRepository: this.multimediaRepository,
      almacenamiento: this.almacenamiento,
    });
    this.servicioAdministrador = new ServicioAdministrador({
      administradorRepository: this.administradorRepository,
      almacenamiento: this.almacenamiento,
    });
    this.servicioPerfilPublico = new ServicioPerfilPublico({
      perfilRepository: this.perfilPublicoRepository,
    });
    this.servicioBusqueda = new ServicioBusqueda({
      userRepository: this.userRepository,
    });
    this.servicioDisponibilidad = new ServicioDisponibilidad({
      disponibilidadRepository: this.disponibilidadRepository,
      estrategiaCalculo: this.estrategiaCalculoDisponibilidad,
    });

    // HU17: Servicio de Aplicación de Mensajes
    this.servicioMensajes = new ServicioMensajes({
      mensajeRepository: this.mensajeRepository,
      realtimeNotifier: this.realtimeNotifier,
      notificacionService: this.notificacionService,
      userRepository: this.userRepository,
    });

    // Adaptador Primario (Controladores de Entrada)
    this.authController = new AuthController(this.servicioAuth, this.servicioRegistro);
    this.usuarioController = new UsuarioController(this.servicioUsuario);
    this.hijoController = new HijoController(this.servicioHijo);
    this.multimediaController = new MultimediaController(this.servicioMultimedia);
    this.administradorController = new AdministradorController(this.servicioAdministrador);
    this.perfilPublicoController = new PerfilPublicoController(this.servicioPerfilPublico);
    this.mensajeriaController = new MensajeriaController(this.servicioMensajes, this.realtimeNotifier);
    this.busquedaController = new BusquedaController(this.servicioBusqueda);
    this.disponibilidadController = new DisponibilidadController(this.servicioDisponibilidad);

    // Middleware de Autenticación
    this.authMiddleware = crearAuthMiddleware(this.tokenService);
  }

  /**
   * Vincula la instancia de Socket.IO con el controlador de WebSockets y el notificador
   */
  inicializarSockets(io) {
    this.realtimeNotifier.setIo(io);
    this.chatSocketController = new ChatSocketController({
      io,
      servicioMensajes: this.servicioMensajes,
      tokenService: this.tokenService,
      realtimeNotifier: this.realtimeNotifier,
    });
    return this.chatSocketController;
  }
}

const container = new Container();

module.exports = container;
