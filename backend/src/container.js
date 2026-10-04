const pool = require('./config/db');
const PostgresUserRepository = require('./infrastructure/adapters/db/PostgresUserRepository');
const BcryptPasswordHasher = require('./infrastructure/adapters/security/BcryptPasswordHasher');
const JwtTokenService = require('./infrastructure/adapters/security/JwtTokenService');
const ServicioAuth = require('./application/services/ServicioAuth');
const ServicioRegistro = require('./application/services/ServicioRegistro');
const ServicioUsuario = require('./application/services/ServicioUsuario');
const AuthController = require('./infrastructure/http/controllers/AuthController');
const UsuarioController = require('./infrastructure/http/controllers/UsuarioController');
const crearAuthMiddleware = require('./infrastructure/http/middlewares/authMiddleware');

/**
 * Contenedor de Inversión de Control / Fábrica de Dependencias (IoC / Factory Pattern)
 * Ensambla los adaptadores de infraestructura e inyecta las dependencias en la capa de aplicación
 */
class Container {
  constructor() {
    // Adaptadores Secundarios (Infraestructura / Salida)
    this.userRepository = new PostgresUserRepository(pool);
    this.passwordHasher = new BcryptPasswordHasher();
    this.tokenService = new JwtTokenService();

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

    // Adaptador Primario (Controladores de Entrada)
    this.authController = new AuthController(this.servicioAuth, this.servicioRegistro);
    this.usuarioController = new UsuarioController(this.servicioUsuario);

    // Middleware de Autenticación
    this.authMiddleware = crearAuthMiddleware(this.tokenService);
  }
}

const container = new Container();

module.exports = container;