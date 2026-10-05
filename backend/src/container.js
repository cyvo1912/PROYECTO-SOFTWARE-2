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
const AuthController = require('./infrastructure/http/controllers/AuthController');
const UsuarioController = require('./infrastructure/http/controllers/UsuarioController');
const HijoController = require('./infrastructure/http/controllers/HijoController');
const MultimediaController = require('./infrastructure/http/controllers/MultimediaController');
const crearAuthMiddleware = require('./infrastructure/http/middlewares/authMiddleware');


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
    this.almacenamiento = new CloudinaryAlmacenamiento();

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

    // Adaptador Primario (Controladores de Entrada)
    this.authController = new AuthController(this.servicioAuth, this.servicioRegistro);
    this.usuarioController = new UsuarioController(this.servicioUsuario);
    this.hijoController = new HijoController(this.servicioHijo);
    this.multimediaController = new MultimediaController(this.servicioMultimedia);

    // Middleware de Autenticación
    this.authMiddleware = crearAuthMiddleware(this.tokenService);
  }
}

const container = new Container();

module.exports = container;