const {
  InvalidCredentialsError,
  AccountPendingError,
  AccountInactiveError,
  RoleMismatchError,
} = require('../../domain/errors/DomainErrors');

/**
 * Servicio de Aplicación: ServicioAuth
 * Objeto oficial del Diagrama de Secuencia (Figura 5 - Sprint 1)
 * Método: iniciarSesion(correo, contrasena)
 */
class ServicioAuth {
  constructor({ userRepository, passwordHasher, tokenService }) {
    if (!userRepository) throw new Error('userRepository es requerido');
    if (!passwordHasher) throw new Error('passwordHasher es requerido');
    if (!tokenService) throw new Error('tokenService es requerido');

    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  /**
   * Ejecuta el flujo del Diagrama de Secuencia: iniciarSesion(correo, contrasena)
   */
  async iniciarSesion(correo, contrasena, rolSolicitado = null) {
    if (!correo || !contrasena) {
      throw new InvalidCredentialsError('Por favor ingresa tu correo y contraseña.');
    }

    const emailNormalizado = correo.trim().toLowerCase();

    // 1. Paso UML: SELECT * FROM Usuario WHERE correo = ?
    const usuario = await this.userRepository.findByEmail(emailNormalizado);
    if (!usuario) {
      // alt [usuario no existe]: error "Credenciales inválidas"
      throw new InvalidCredentialsError('Credenciales inválidas.');
    }

    // 2. Paso UML: Validar contraseña con algoritmo hash
    const esContrasenaValida = await this.passwordHasher.compare(contrasena, usuario.contrasenaHash);
    if (!esContrasenaValida) {
      // alt [contraseña inválida]: error "Credenciales inválidas"
      throw new InvalidCredentialsError('Credenciales inválidas.');
    }

    // 3. Validación de rol móvil si fue especificado (SOLID OCP via Dominio)
    if (rolSolicitado && !usuario.coincideConRol(rolSolicitado)) {
      throw new RoleMismatchError(usuario.tipoUsuario);
    }

    // 4. Criterio HU4 Escenario 2: Cuenta pendiente de validación
    if (usuario.estaPendienteVerificacion()) {
      throw new AccountPendingError('Cuenta pendiente de verificación.');
    }

    if (!usuario.estaActivo()) {
      throw new AccountInactiveError('Tu cuenta se encuentra inactiva o suspendida.');
    }

    // 5. Cargar datos específicos del rol (Padre o Niñera)
    let perfilEspecifico = null;
    if (usuario.tipoUsuario === 'NINERA') {
      perfilEspecifico = await this.userRepository.findNineraDetails(usuario.id);
    } else if (usuario.tipoUsuario === 'FAMILIA') {
      perfilEspecifico = await this.userRepository.findPadreDetails(usuario.id);
    }

    // 6. Generar Token JWT de autenticación (HU1 T2)
    const token = this.tokenService.generateToken({
      id: usuario.id,
      correo: usuario.correo,
      tipo_usuario: usuario.tipoUsuario,
    });

    // 7. Retornar resultado OK (usuarioAutenticado) según Diagrama de Secuencia
    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombreCompleto,
        nombreUsuario: usuario.nombre,
        apellidoUsuario: usuario.apellido,
        correo: usuario.correo,
        dni: usuario.dni,
        celular: usuario.celular,
        rol: usuario.tipoUsuario,
        estado: usuario.estadoCuenta,
        detalles: perfilEspecifico,
      },
    };
  }

  /**
   * Cierre de sesión (HU6 / Figura 5 Diagrama de Secuencia - Sprint 1)
   * Invalida el token JWT para impedir el uso posterior de recursos protegidos.
   */
  async cerrarSesion(token) {
    if (!token) {
      return { success: true, message: 'Sesión ya finalizada.' };
    }

    // Invalida el token en el servicio de tokens (lista de revocación)
    this.tokenService.invalidateToken(token);

    return {
      success: true,
      message: 'Cierre de sesión exitoso.',
    };
  }
}

module.exports = ServicioAuth;
