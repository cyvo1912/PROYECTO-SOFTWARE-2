const {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require('../../domain/errors/DomainErrors');

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_MENSAJE = 500;
const MAX_TARIFA = 500;

/**
 * Servicio de Aplicación: ServicioBolsaTrabajo
 * HU14: "Como niñera, quiero explorar la bolsa de trabajo con todas las ofertas
 * publicadas por familias para postularme a servicios acordes a mi perfil."
 *
 * - La niñera explora las ofertas abiertas, ve cuáles son acordes a su perfil
 *   (zona/distritos de trabajo y tarifa) y se postula una sola vez por oferta.
 * - La familia publica las ofertas que alimentan la bolsa.
 */
class ServicioBolsaTrabajo {
  constructor({ ofertaTrabajoRepository, obtenerFechaHoy = fechaHoyLima }) {
    if (!ofertaTrabajoRepository) {
      throw new Error('ofertaTrabajoRepository es requerido en ServicioBolsaTrabajo');
    }
    this.ofertaTrabajoRepository = ofertaTrabajoRepository;
    this.obtenerFechaHoy = obtenerFechaHoy;
  }

  /**
   * Lista las ofertas abiertas con su compatibilidad respecto al perfil de la niñera.
   * @param {Object} usuario - Usuario autenticado (req.user)
   * @param {Object} filtros - { q?, distrito?, tarifaMin?, soloCompatibles? }
   */
  async explorarOfertas(usuario, filtros = {}) {
    const idNinera = exigirSesion(usuario, 'explorar la bolsa de trabajo');
    const perfil = await this._obtenerPerfil(idNinera);
    const criterios = normalizarFiltros(filtros);

    const [ofertas, idsPostuladas] = await Promise.all([
      this.ofertaTrabajoRepository.listarAbiertas({
        q: criterios.q,
        distrito: criterios.distrito,
        tarifaMin: criterios.tarifaMin,
        desdeFecha: this.obtenerFechaHoy(),
      }),
      this.ofertaTrabajoRepository.listarIdsOfertasPostuladas(idNinera),
    ]);

    const postuladas = new Set(idsPostuladas);
    let resultado = ofertas.map((oferta) => aVistaNinera(oferta, perfil, postuladas.has(oferta.id)));

    if (criterios.soloCompatibles) {
      resultado = resultado.filter((o) => o.compatibilidad.esAcorde);
    }

    // Primero las acordes al perfil; dentro de cada grupo se respeta el orden del repositorio
    resultado.sort((a, b) => Number(b.compatibilidad.esAcorde) - Number(a.compatibilidad.esAcorde));

    return {
      perfil: {
        zona: perfil.zona,
        distritos: perfil.distritos,
        tarifaHora: perfil.tarifaHora,
      },
      total: resultado.length,
      ofertas: resultado,
    };
  }

  /**
   * Detalle de una oferta para la niñera.
   */
  async obtenerOferta(usuario, idOfertaParam) {
    const idNinera = exigirSesion(usuario, 'ver la oferta');
    const idOferta = validarId(idOfertaParam);
    const perfil = await this._obtenerPerfil(idNinera);

    const oferta = await this.ofertaTrabajoRepository.findById(idOferta);
    if (!oferta) {
      throw new NotFoundError('La oferta de trabajo no existe.');
    }
    const idsPostuladas = await this.ofertaTrabajoRepository.listarIdsOfertasPostuladas(idNinera);
    return aVistaNinera(oferta, perfil, idsPostuladas.includes(oferta.id));
  }

  /**
   * La niñera se postula a una oferta abierta (una sola vez por oferta).
   */
  async postular(usuario, idOfertaParam, datos = {}) {
    const idNinera = exigirSesion(usuario, 'postularte');
    const idOferta = validarId(idOfertaParam);

    const mensaje = textoOpcional(datos.mensaje);
    if (mensaje && mensaje.length > MAX_MENSAJE) {
      throw new ValidationError('Revisa los campos del formulario.', {
        mensaje: `El mensaje no puede superar los ${MAX_MENSAJE} caracteres.`,
      });
    }

    await this._obtenerPerfil(idNinera);

    const oferta = await this.ofertaTrabajoRepository.findById(idOferta);
    if (!oferta) {
      throw new NotFoundError('La oferta de trabajo no existe.');
    }
    if (!oferta.estaAbierta() || oferta.fechaInicio < this.obtenerFechaHoy()) {
      throw new ConflictError('Esta oferta ya no está disponible para postular.');
    }

    const idsPostuladas = await this.ofertaTrabajoRepository.listarIdsOfertasPostuladas(idNinera);
    if (idsPostuladas.includes(idOferta)) {
      throw new ConflictError('Ya te postulaste a esta oferta.');
    }

    return this.ofertaTrabajoRepository.crearPostulacion(idOferta, idNinera, mensaje);
  }

  /**
   * Postulaciones realizadas por la niñera autenticada.
   */
  async listarMisPostulaciones(usuario) {
    const idNinera = exigirSesion(usuario, 'ver tus postulaciones');
    return this.ofertaTrabajoRepository.listarPostulacionesPorNinera(idNinera);
  }

  /**
   * La familia publica una oferta de trabajo en la bolsa.
   */
  async publicarOferta(usuario, datos = {}) {
    const idPadre = exigirSesion(usuario, 'publicar una oferta');
    const oferta = this._validarOferta(datos);
    return this.ofertaTrabajoRepository.crearOferta(idPadre, oferta);
  }

  /**
   * Ofertas publicadas por la familia autenticada (con su número de postulaciones).
   */
  async listarMisOfertas(usuario) {
    const idPadre = exigirSesion(usuario, 'ver tus ofertas');
    return this.ofertaTrabajoRepository.listarPorPadre(idPadre);
  }

  async _obtenerPerfil(idNinera) {
    const perfil = await this.ofertaTrabajoRepository.obtenerPerfilNinera(idNinera);
    if (!perfil) {
      throw new NotFoundError('No se encontró tu perfil de niñera.');
    }
    return perfil;
  }

  _validarOferta(datos) {
    const errores = {};
    const titulo = textoOpcional(datos.titulo);
    const descripcion = textoOpcional(datos.descripcion);
    const distrito = textoOpcional(datos.distrito);
    const fechaInicio = textoOpcional(datos.fechaInicio);
    const horaInicio = textoOpcional(datos.horaInicio);
    const horaFin = textoOpcional(datos.horaFin);
    const edadesNinos = textoOpcional(datos.edadesNinos);
    const requisitos = textoOpcional(datos.requisitos);
    const tarifaHora = Number(datos.tarifaHora);
    const numeroNinos = Number(datos.numeroNinos);

    if (!titulo) errores.titulo = 'El título es obligatorio.';
    else if (titulo.length < 5 || titulo.length > 120) errores.titulo = 'El título debe tener entre 5 y 120 caracteres.';

    if (!descripcion) errores.descripcion = 'La descripción es obligatoria.';
    else if (descripcion.length < 10 || descripcion.length > 1000) {
      errores.descripcion = 'La descripción debe tener entre 10 y 1000 caracteres.';
    }

    if (!distrito) errores.distrito = 'El distrito es obligatorio.';
    else if (distrito.length > 100) errores.distrito = 'El distrito no puede superar los 100 caracteres.';

    if (!fechaInicio) errores.fechaInicio = 'La fecha de inicio es obligatoria.';
    else if (!esFechaValidaISO(fechaInicio)) errores.fechaInicio = 'Usa el formato AAAA-MM-DD.';
    else if (fechaInicio < this.obtenerFechaHoy()) errores.fechaInicio = 'La fecha no puede ser anterior a hoy.';

    if (!horaInicio) errores.horaInicio = 'La hora de inicio es obligatoria.';
    else if (!REGEX_HORA.test(horaInicio)) errores.horaInicio = 'Usa el formato HH:MM (24 horas).';

    if (!horaFin) errores.horaFin = 'La hora de fin es obligatoria.';
    else if (!REGEX_HORA.test(horaFin)) errores.horaFin = 'Usa el formato HH:MM (24 horas).';
    else if (!errores.horaInicio && horaFin <= horaInicio) {
      errores.horaFin = 'La hora de fin debe ser posterior a la de inicio.';
    }

    if (datos.tarifaHora === undefined || datos.tarifaHora === null || datos.tarifaHora === '') {
      errores.tarifaHora = 'La tarifa por hora es obligatoria.';
    } else if (!Number.isFinite(tarifaHora) || tarifaHora <= 0 || tarifaHora > MAX_TARIFA) {
      errores.tarifaHora = `Ingresa una tarifa entre 1 y ${MAX_TARIFA} soles.`;
    }

    if (!Number.isInteger(numeroNinos) || numeroNinos < 1 || numeroNinos > 10) {
      errores.numeroNinos = 'Indica entre 1 y 10 niños.';
    }

    if (edadesNinos && edadesNinos.length > 100) errores.edadesNinos = 'Máximo 100 caracteres.';
    if (requisitos && requisitos.length > 500) errores.requisitos = 'Máximo 500 caracteres.';

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los campos del formulario.', errores);
    }

    return {
      titulo,
      descripcion,
      distrito,
      fechaInicio,
      horaInicio,
      horaFin,
      tarifaHora: Math.round(tarifaHora * 100) / 100,
      numeroNinos,
      edadesNinos,
      requisitos,
    };
  }
}

/**
 * Una oferta es acorde al perfil si su distrito está entre las zonas de trabajo
 * de la niñera y si paga al menos la tarifa que ella cobra.
 */
function evaluarCompatibilidad(oferta, perfil) {
  const zonasNinera = [perfil.zona, ...(perfil.distritos || [])]
    .filter(Boolean)
    .map(normalizarTexto);
  const distritoOferta = normalizarTexto(oferta.distrito);

  const zonaCoincide = zonasNinera.length > 0 && zonasNinera.includes(distritoOferta);
  const tarifaAdecuada =
    perfil.tarifaHora === null || perfil.tarifaHora === undefined
      ? true
      : Number(oferta.tarifaHora) >= Number(perfil.tarifaHora);

  return {
    esAcorde: zonaCoincide && tarifaAdecuada,
    zonaCoincide,
    tarifaAdecuada,
  };
}

function aVistaNinera(oferta, perfil, yaPostulada) {
  return {
    id: oferta.id,
    titulo: oferta.titulo,
    descripcion: oferta.descripcion,
    distrito: oferta.distrito,
    fechaInicio: oferta.fechaInicio,
    horaInicio: oferta.horaInicio,
    horaFin: oferta.horaFin,
    tarifaHora: oferta.tarifaHora,
    numeroNinos: oferta.numeroNinos,
    edadesNinos: oferta.edadesNinos,
    requisitos: oferta.requisitos,
    estado: oferta.estado,
    fechaPublicacion: oferta.fechaPublicacion,
    familia: { nombre: oferta.nombreFamilia || 'Familia' },
    compatibilidad: evaluarCompatibilidad(oferta, perfil),
    yaPostulada: Boolean(yaPostulada),
  };
}

function normalizarFiltros({ q, distrito, tarifaMin, soloCompatibles } = {}) {
  const errores = {};
  const criterios = {
    q: textoOpcional(q),
    distrito: textoOpcional(distrito),
    tarifaMin: null,
    soloCompatibles: soloCompatibles === true || soloCompatibles === 'true' || soloCompatibles === '1',
  };

  if (tarifaMin !== undefined && tarifaMin !== null && String(tarifaMin).trim() !== '') {
    const valor = Number(tarifaMin);
    if (!Number.isFinite(valor) || valor < 0) {
      errores.tarifaMin = 'La tarifa mínima debe ser un número mayor o igual a 0.';
    } else {
      criterios.tarifaMin = valor;
    }
  }
  if (criterios.q && criterios.q.length > 100) errores.q = 'La búsqueda no puede superar los 100 caracteres.';
  if (criterios.distrito && criterios.distrito.length > 100) errores.distrito = 'Máximo 100 caracteres.';

  if (Object.keys(errores).length > 0) {
    throw new ValidationError('Revisa los filtros de búsqueda.', errores);
  }
  return criterios;
}

function exigirSesion(usuario, accion) {
  if (!usuario || !usuario.id) {
    throw new UnauthorizedError(`Debes iniciar sesión para ${accion}.`);
  }
  return Number(usuario.id);
}

function validarId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new NotFoundError('La oferta de trabajo no existe.');
  }
  return id;
}

function textoOpcional(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function esFechaValidaISO(valor) {
  if (!REGEX_FECHA_ISO.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria de Lima. */
function fechaHoyLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

module.exports = ServicioBolsaTrabajo;
module.exports.evaluarCompatibilidad = evaluarCompatibilidad;
