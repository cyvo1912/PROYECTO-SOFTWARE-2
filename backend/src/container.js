const pool = require('./config/db');
const PostgresUserRepository = require('./infrastructure/adapters/db/PostgresUserRepository');
const PrismaUserRepository = require('./infrastructure/adapters/db/PrismaUserRepository');
const BcryptPasswordHasher = require('./infrastructure/adapters/security/BcryptPasswordHasher');
const JwtTokenService = require('./infrastructure/adapters/security/JwtTokenService');
const PostgresMultimediaRepository = require('./infrastructure/adapters/db/PostgresMultimediaRepository');
const CloudinaryAlmacenamiento = require('./infrastructure/adapters/storage/CloudinaryAlmacenamiento');
const ServicioAuth = require('./application/services/ServicioAuth');
const ServicioRegistro = require('./application/services/ServicioRegistro');
const ServicioUsuario = require('./application/services/ServicioUsuario');
const ServicioMultimedia = require('./application/services/ServicioMultimedia');
const AuthController = require('./infrastructure/http/controllers/AuthController');
const UsuarioController = require('./infrastructure/http/controllers/UsuarioController');
const MultimediaController = require('./infrastructure/http/controllers/MultimediaController');
const crearAuthMiddleware = require('./infrastructure/http/middlewares/authMiddleware');

/**
 * Contenedor de Inversión de Control / Fábrica de Dependencias (IoC / Factory Pattern)
 * Demuestra los principios SOLID (Dependency Inversion Principle):
 * Permite conmutar la implementación de persistencia (PostgreSQL nativo vs Prisma ORM)
 * sin modificar una sola línea de la lógica de negocio ni de los servicios.
 */
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
    } else {
      this.userRepository = new PostgresUserRepository(pool);
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
    this.servicioMultimedia = new ServicioMultimedia({
      multimediaRepository: this.multimediaRepository,
      almacenamiento: this.almacenamiento,
    });

    // Adaptador Primario (Controladores de Entrada)
    this.authController = new AuthController(this.servicioAuth, this.servicioRegistro);
    this.usuarioController = new UsuarioController(this.servicioUsuario);
    this.multimediaController = new MultimediaController(this.servicioMultimedia);

    // Middleware de Autenticación
    this.authMiddleware = crearAuthMiddleware(this.tokenService);
  }
}

const container = new Container();

module.exports = container;