const {
  ValidationError,
  CriticalFieldModificationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../../domain/errors/DomainErrors');

const CELULAR_REGEX = /^\+?\d{9,15}$/;

/**
 * Servicio de Aplicación: ServicioUsuario
 * Basado en el Diagrama de Secuencia Oficial (Figura 6 - Sprint 1)
 * Responsabilidad: Gestionar la consulta y actualización de la información de cuenta y perfil.
 */
class ServicioUsuario {
  constructor({ userRepository }) {
    if (!userRepository) throw new Error('userRepository es requerido en ServicioUsuario');
    this.userRepository = userRepository;
  }

  /**
   * Obtiene la información del perfil completo de la niñera para edición.
   * Flujo UML Figura 6: solicitarDatosActuales(idUsuario)
   */
  async obtenerPerfilNinera(idUsuario) {
    if (!idUsuario) {
      throw new UnauthorizedError('Identificador de usuario no proporcionado.');
    }

    const usuario = await this.userRepository.findById(idUsuario);
    if (!usuario) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    if (usuario.tipoUsuario !== 'NINERA') {
      throw new ForbiddenError('El perfil solicitado no corresponde a una niñera.');
    }

    const detalles = await this.userRepository.findNineraDetails(idUsuario);

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo,
      dni: usuario.dni,
      celular: usuario.celular,
      rol: usuario.tipoUsuario,
      estado: usuario.estadoCuenta,
      detalles: detalles
        ? {
            idNinera: detalles.idNinera || detalles.id_ninera,
            zona: detalles.zona,
            experiencia: detalles.experiencia,
            tarifaHora:
              detalles.tarifaHora !== undefined
                ? Number(detalles.tarifaHora)
                : detalles.tarifa_hora !== undefined
                ? Number(detalles.tarifa_hora)
                : 0,
            tarifa_hora:
              detalles.tarifa_hora !== undefined
                ? Number(detalles.tarifa_hora)
                : detalles.tarifaHora !== undefined
                ? Number(detalles.tarifaHora)
                : 0,
            descripcion: detalles.descripcion,
          }
        : {
            zona: null,
            experiencia: '',
            tarifaHora: 0,
            tarifa_hora: 0,
            descripcion: '',
          },
    };
  }

  /**
   * Actualiza el perfil profesional de la niñera (HU5).
   * Flujo UML Figura 6: actualizarPerfil(idUsuario, nuevosDatos) -> validarCampos -> UPDATE
   *
   * Reglas críticas del documento y HU5:
   * 1. Solo una niñera autenticada puede editar su propio perfil (idAutenticado === idObjetivo).
   * 2. DNI no debe poder modificarse (Restricción 2 / HU5 Escenario 2).
   * 3. Correo no debe poder modificarse (Restricción 2).
   * 4. Validación de campos obligatorios en backend.
   */
  async actualizarPerfilNinera(idUsuarioAutenticado, idObjetivo, datos) {
    // 1. Control de acceso / Prevención IDOR
    if (!idUsuarioAutenticado) {
      throw new UnauthorizedError('Debes iniciar sesión para editar tu perfil.');
    }

    if (Number(idUsuarioAutenticado) !== Number(idObjetivo)) {
      throw new ForbiddenError('No tienes permisos para modificar el perfil de otra niñera.');
    }

    // 2. Verificar existencia del usuario en BD
    const usuarioExistente = await this.userRepository.findById(idUsuarioAutenticado);
    if (!usuarioExistente) {
      throw new NotFoundError('Niñera no encontrada.');
    }

    if (usuarioExistente.tipoUsuario !== 'NINERA') {
      throw new ForbiddenError('Solo usuarios con perfil de Niñera pueden actualizar datos profesionales.');
    }

    // 3. Regla Crítica: DNI y Correo protegidos en backend (Restricción 2)
    // Si la petición intenta enviar un valor diferente para DNI o Correo, o pretende modificarlos:
    if (datos.dni !== undefined && String(datos.dni).trim() !== String(usuarioExistente.dni).trim()) {
      throw new CriticalFieldModificationError('Por políticas de seguridad, el DNI no puede ser modificado.');
    }

    if (
      (datos.correo !== undefined && String(datos.correo).trim().toLowerCase() !== String(usuarioExistente.correo).trim().toLowerCase()) ||
      (datos.email !== undefined && String(datos.email).trim().toLowerCase() !== String(usuarioExistente.correo).trim().toLowerCase())
    ) {
      throw new CriticalFieldModificationError('Por políticas de seguridad, el correo electrónico no puede ser modificado.');
    }

    // 4. Validar campos obligatorios y formato
    const errores = {};
    const { nombre, apellido, celular, experiencia, tarifaHora, zona, descripcion, sobreMi } = datos;

    if (!nombre || !nombre.trim()) {
      errores.nombre = 'El nombre es obligatorio.';
    }

    if (!apellido || !apellido.trim()) {
      errores.apellido = 'El apellido es obligatorio.';
    }

    if (!celular || !celular.trim()) {
      errores.celular = 'El número de teléfono es obligatorio.';
    } else if (!CELULAR_REGEX.test(celular.replace(/[\s-]/g, ''))) {
      errores.celular = 'El teléfono no tiene un formato válido.';
    }

    if (!experiencia || !experiencia.trim()) {
      errores.experiencia = 'La experiencia profesional es obligatoria.';
    }

    const tarifa = Number(tarifaHora);
    if (tarifaHora === undefined || tarifaHora === null || tarifaHora === '' || isNaN(tarifa)) {
      errores.tarifaHora = 'La tarifa por hora es obligatoria.';
    } else if (!Number.isFinite(tarifa) || tarifa <= 0) {
      errores.tarifaHora = 'La tarifa por hora debe ser mayor a 0.';
    }

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Datos incompletos o inválidos.', errores);
    }

    // 5. Preparar DTOs para persistencia
    const datosUsuario = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      celular: celular.trim(),
    };

    // 'sobreMi' mapea a descripcion según el mockup de Figma/Documento (Figura 17)
    const descFinal = (sobreMi !== undefined ? sobreMi : descripcion) || '';

    const datosNinera = {
      zona: zona && zona.trim() ? zona.trim() : null,
      experiencia: experiencia.trim(),
      tarifaHora: tarifa,
      descripcion: descFinal.trim() || null,
    };

    // 6. Persistencia mediante el repositorio existente
    const nineraActualizada = await this.userRepository.actualizarPerfilNinera(
      idUsuarioAutenticado,
      datosUsuario,
      datosNinera,
    );

    return {
      id: nineraActualizada.id,
      nombre: nineraActualizada.nombre,
      apellido: nineraActualizada.apellido,
      nombreCompleto: nineraActualizada.nombreCompleto,
      correo: nineraActualizada.correo,
      dni: nineraActualizada.dni,
      celular: nineraActualizada.celular,
      rol: nineraActualizada.tipoUsuario,
      estado: nineraActualizada.estadoCuenta,
      detalles: {
        idNinera: nineraActualizada.idNinera,
        zona: nineraActualizada.zona,
        experiencia: nineraActualizada.experiencia,
        tarifaHora: nineraActualizada.tarifaHora,
        tarifa_hora: nineraActualizada.tarifaHora,
        descripcion: nineraActualizada.descripcion,
      },
    };
  }
}

module.exports = ServicioUsuario;
