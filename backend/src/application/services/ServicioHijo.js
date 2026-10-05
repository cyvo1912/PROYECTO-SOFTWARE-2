const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../../domain/errors/DomainErrors');

const MAX_NOMBRE = 100;
const MAX_TEXTO = 500;

/**
 * Servicio de Aplicación: ServicioHijo
 * HU: Como familia, quiero registrar y editar los perfiles de mis hijos
 * (edades, alergias y cuidados médicos) para que las niñeras conozcan sus requerimientos.
 * Métodos: listarHijos · registrarHijo · actualizarHijo
 */
class ServicioHijo {
  constructor({ hijoRepository }) {
    if (!hijoRepository) throw new Error('hijoRepository es requerido en ServicioHijo');
    this.hijoRepository = hijoRepository;
  }

  async listarHijos(idPadre) {
    this._exigirSesion(idPadre);
    const hijos = await this.hijoRepository.listarPorPadre(idPadre);
    return hijos.map(aRespuesta);
  }

  async registrarHijo(idPadre, datos) {
    this._exigirSesion(idPadre);
    const datosValidos = this._validar(datos);
    const hijo = await this.hijoRepository.crear(idPadre, datosValidos);
    return aRespuesta(hijo);
  }

  /**
   * Solo la familia dueña del perfil puede editarlo (prevención IDOR):
   * el id del padre sale del token, nunca del body.
   */
  async actualizarHijo(idPadre, idHijo, datos) {
    this._exigirSesion(idPadre);

    const id = Number(idHijo);
    if (!Number.isInteger(id) || id <= 0) {
      throw new NotFoundError('Perfil del niño no encontrado.');
    }

    const hijoExistente = await this.hijoRepository.findById(id);
    if (!hijoExistente) {
      throw new NotFoundError('Perfil del niño no encontrado.');
    }
    if (!hijoExistente.perteneceA(idPadre)) {
      throw new ForbiddenError('No tienes permisos para modificar el perfil de este niño.');
    }

    const datosValidos = this._validar(datos);
    const hijo = await this.hijoRepository.actualizar(id, datosValidos);
    if (!hijo) {
      throw new NotFoundError('Perfil del niño no encontrado.');
    }
    return aRespuesta(hijo);
  }

  _exigirSesion(idPadre) {
    if (!idPadre) {
      throw new UnauthorizedError('Debes iniciar sesión para gestionar los perfiles de tus hijos.');
    }
  }

  /**
   * Junta TODOS los errores en un solo ValidationError para que el
   * formulario pueda marcar cada campo de una sola vez.
   */
  _validar(datos = {}) {
    const { nombre, edad, alergias, condicionesMedicas, notas } = datos;
    const errores = {};

    if (typeof nombre !== 'string' || !nombre.trim()) {
      errores.nombre = 'El nombre es obligatorio.';
    } else if (nombre.trim().length > MAX_NOMBRE) {
      errores.nombre = `El nombre no puede superar los ${MAX_NOMBRE} caracteres.`;
    }

    const edadNum = Number(edad);
    if (edad === undefined || edad === null || edad === '' || isNaN(edadNum)) {
      errores.edad = 'La edad es obligatoria.';
    } else if (!Number.isInteger(edadNum) || edadNum < 0 || edadNum > 17) {
      errores.edad = 'La edad debe ser un número entero entre 0 y 17.';
    }

    const textosOpcionales = { alergias, condicionesMedicas, notas };
    for (const [campo, valor] of Object.entries(textosOpcionales)) {
      if (valor === undefined || valor === null) continue;
      if (typeof valor !== 'string') {
        errores[campo] = 'Debe ser un texto.';
      } else if (valor.trim().length > MAX_TEXTO) {
        errores[campo] = `No puede superar los ${MAX_TEXTO} caracteres.`;
      }
    }

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los campos del formulario.', errores);
    }

    return {
      nombre: nombre.trim(),
      edad: edadNum,
      alergias: textoOpcional(alergias),
      condicionesMedicas: textoOpcional(condicionesMedicas),
      notas: textoOpcional(notas),
    };
  }
}

function textoOpcional(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function aRespuesta(hijo) {
  return {
    id: hijo.id,
    nombre: hijo.nombre,
    edad: hijo.edad,
    alergias: hijo.alergias,
    condicionesMedicas: hijo.condicionesMedicas,
    notas: hijo.notas,
  };
}

module.exports = ServicioHijo;
