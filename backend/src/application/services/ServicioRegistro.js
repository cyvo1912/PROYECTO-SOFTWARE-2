const {
  ValidationError,
  EmailAlreadyExistsError,
  DniAlreadyExistsError,
} = require('../../domain/errors/DomainErrors');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DNI_REGEX = /^\d{8}$/; // DNI peruano: 8 dígitos
const CELULAR_REGEX = /^\+?\d{9,15}$/;

/**
 * Servicio de Aplicación: ServicioRegistro
 * Flujo análogo al de ServicioAuth, pero para la creación de cuentas nuevas
 * (mockups "Registro como Familia" y "Registro como Niñera").
 * Métodos: registrarPadre(datos) · registrarNinera(datos)
 */
class ServicioRegistro {
  constructor({ userRepository, passwordHasher, tokenService }) {
    if (!userRepository) throw new Error('userRepository es requerido');
    if (!passwordHasher) throw new Error('passwordHasher es requerido');
    if (!tokenService) throw new Error('tokenService es requerido');

    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  /**
   * Valida los datos de identidad comunes a cualquier registro (familia o
   * niñera) y junta TODOS los errores encontrados en un solo ValidationError,
   * para que el formulario pueda marcar cada campo de una sola vez.
   */
  _validarIdentidad(datos, errores) {
    const { nombre, apellido, correo, dni, celular, contrasena } = datos;

    if (!nombre || !nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
    if (!apellido || !apellido.trim()) errores.apellido = 'El apellido es obligatorio.';

    if (!correo || !correo.trim()) errores.correo = 'El correo es obligatorio.';
    else if (!EMAIL_REGEX.test(correo.trim())) errores.correo = 'El correo no tiene un formato válido.';

    if (!dni || !dni.trim()) errores.dni = 'El DNI es obligatorio.';
    else if (!DNI_REGEX.test(dni.trim())) errores.dni = 'El DNI debe tener 8 dígitos.';

    if (!celular || !celular.trim()) errores.celular = 'El teléfono es obligatorio.';
    else if (!CELULAR_REGEX.test(celular.replace(/[\s-]/g, ''))) errores.celular = 'El teléfono no es válido.';

    if (!contrasena) errores.contrasena = 'La contraseña es obligatoria.';
    else if (contrasena.length < 8) errores.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
  }

  /** HU: Registro de familia. Mockup "Registro como Familia". */
  async registrarPadre(datos) {
    const { nombre, apellido, correo, dni, celular, contrasena, nombreFamilia, direccion, numeroNinos, edadesNinos } = datos;

    const errores = {};
    this._validarIdentidad(datos, errores);

    if (!nombreFamilia || !nombreFamilia.trim()) errores.nombreFamilia = 'El nombre de la familia es obligatorio.';
    if (!direccion || !direccion.trim()) errores.direccion = 'La dirección es obligatoria.';

    const numNinos = Number(numeroNinos);
    if (numeroNinos === undefined || numeroNinos === null || numeroNinos === '' || isNaN(numNinos)) {
      errores.numeroNinos = 'El número de niños es obligatorio.';
    } else if (!Number.isInteger(numNinos) || numNinos < 1 || numNinos > 10) {
      errores.numeroNinos = 'Debe ser un número entero entre 1 y 10.';
    }

    const listaEdades = Array.isArray(edadesNinos) ? edadesNinos.map(Number) : [];
    if (listaEdades.length === 0) errores.edadesNinos = 'Indica la edad de cada niño.';
    else if (listaEdades.some((edad) => !Number.isInteger(edad) || edad < 0 || edad > 17)) {
      errores.edadesNinos = 'Cada edad debe ser un número entero entre 0 y 17.';
    } else if (!errores.numeroNinos && listaEdades.length !== numNinos) {
      errores.edadesNinos = `Indica ${numNinos} edad(es), una por cada niño.`;
    }

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los campos del formulario.', errores);
    }

    const emailNormalizado = correo.trim().toLowerCase();
    if (await this.userRepository.findByEmail(emailNormalizado)) {
      throw new EmailAlreadyExistsError();
    }
    if (await this.userRepository.findByDni(dni.trim())) {
      throw new DniAlreadyExistsError();
    }

    const contrasenaHash = await this.passwordHasher.hash(contrasena);

    const padre = await this.userRepository.crearPadre(
      {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: emailNormalizado,
        dni: dni.trim(),
        celular: celular.trim(),
        contrasenaHash,
      },
      {
        nombreFamilia: nombreFamilia.trim(),
        direccion: direccion.trim(),
        numeroNinos: numNinos,
        edadesNinos: listaEdades,
      },
    );

    // La familia no requiere verificación manual: queda con la sesión ya iniciada.
    const token = this.tokenService.generateToken({
      id: padre.id,
      correo: padre.correo,
      tipo_usuario: padre.tipoUsuario,
    });

    return {
      token,
      usuario: {
        id: padre.id,
        nombre: padre.nombreCompleto,
        correo: padre.correo,
        rol: padre.tipoUsuario,
        estado: padre.estadoCuenta,
        detalles: {
          nombre_familia: padre.nombreFamilia,
          direccion: padre.direccion,
          numero_ninos: padre.numeroNinos,
        },
      },
    };
  }

  /** HU: Registro de niñera. Mockup "Registro como Niñera". Restricción 13: requiere verificación manual del admin. */
  async registrarNinera(datos) {
    const { experiencia, tarifaHora, descripcion } = datos;

    const errores = {};
    this._validarIdentidad(datos, errores);

    if (!experiencia || !experiencia.trim()) errores.experiencia = 'Cuéntanos tu experiencia.';

    const tarifa = Number(tarifaHora);
    if (tarifaHora === undefined || tarifaHora === null || tarifaHora === '' || isNaN(tarifa)) {
      errores.tarifaHora = 'La tarifa por hora es obligatoria.';
    } else if (!Number.isFinite(tarifa) || tarifa <= 0) {
      errores.tarifaHora = 'Ingresa un monto mayor a 0.';
    }

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los campos del formulario.', errores);
    }

    const { nombre, apellido, correo, dni, celular, contrasena } = datos;
    const emailNormalizado = correo.trim().toLowerCase();
    if (await this.userRepository.findByEmail(emailNormalizado)) {
      throw new EmailAlreadyExistsError();
    }
    if (await this.userRepository.findByDni(dni.trim())) {
      throw new DniAlreadyExistsError();
    }

    const contrasenaHash = await this.passwordHasher.hash(contrasena);

    const ninera = await this.userRepository.crearNinera(
      {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: emailNormalizado,
        dni: dni.trim(),
        celular: celular.trim(),
        contrasenaHash,
      },
      {
        experiencia: experiencia.trim(),
        tarifaHora: tarifa,
        descripcion: descripcion && descripcion.trim() ? descripcion.trim() : null,
      },
    );

    // Restricción 13: la cuenta queda PENDIENTE_VERIFICACION; no se emite token.
    return {
      usuario: {
        id: ninera.id,
        nombre: ninera.nombreCompleto,
        correo: ninera.correo,
        rol: ninera.tipoUsuario,
        estado: ninera.estadoCuenta,
      },
    };
  }
}

module.exports = ServicioRegistro;
