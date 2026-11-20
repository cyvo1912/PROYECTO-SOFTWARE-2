const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../../domain/errors/DomainErrors');
const {
  EstrategiaDisponibilidadRangoFechas,
} = require('../../domain/strategies/EstrategiaCalculoDisponibilidad');

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS_RANGO = 62;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Servicio de Aplicación: ServicioDisponibilidad
 * HU: "Como familia, quiero consultar la disponibilidad de una niñera en un
 * calendario interactivo para saber en qué horarios puede prestar servicio."
 *
 * Aplica SOLID (SRP, DIP) y GRASP (Alta Cohesión, Bajo Acoplamiento, Indirección).
 */
class ServicioDisponibilidad {
  constructor({
    disponibilidadRepository,
    estrategiaCalculo = new EstrategiaDisponibilidadRangoFechas(),
  }) {
    if (!disponibilidadRepository) {
      throw new Error('disponibilidadRepository es requerido en ServicioDisponibilidad');
    }
    this.disponibilidadRepository = disponibilidadRepository;
    this.estrategiaCalculo = estrategiaCalculo;
  }

  /**
   * Lista las niñeras activas disponibles para consulta de horario.
   */
  async listarNinerasDisponibles(usuarioSolicitante) {
    if (!usuarioSolicitante || !usuarioSolicitante.id) {
      throw new UnauthorizedError('Debes iniciar sesión para consultar las niñeras disponibles.');
    }
    if (usuarioSolicitante.tipo_usuario !== 'FAMILIA') {
      throw new ForbiddenError('Solo las familias pueden consultar la disponibilidad de niñeras.');
    }
    const nineras = await this.disponibilidadRepository.listarNinerasActivas();
    return nineras.map((n) => ({
      id: n.idNinera,
      nombreCompleto: n.nombreCompleto,
      tarifaHora: n.tarifaHora,
      zona: n.zona,
      verificada: n.verificada,
    }));
  }

  /**
   * Consulta la disponibilidad de una niñera dentro de un rango de fechas.
   * @param {Object} usuarioSolicitante - Usuario autenticado desde el JWT
   * @param {number|string} idNineraParam - Identificador de la niñera
   * @param {Object} filtros - { desde?: 'YYYY-MM-DD', hasta?: 'YYYY-MM-DD' }
   */
  async consultarDisponibilidad(usuarioSolicitante, idNineraParam, filtros = {}) {
    if (!usuarioSolicitante || !usuarioSolicitante.id) {
      throw new UnauthorizedError('Debes iniciar sesión para consultar la disponibilidad.');
    }
    if (usuarioSolicitante.tipo_usuario !== 'FAMILIA') {
      throw new ForbiddenError('Solo las familias pueden consultar la disponibilidad de niñeras.');
    }

    const idNinera = Number(idNineraParam);
    if (!Number.isInteger(idNinera) || idNinera <= 0) {
      throw new ValidationError('El identificador de la niñera no es válido.', {
        idNinera: 'Debe ser un número entero positivo.',
      });
    }

    const { fechaDesde, fechaHasta } = this._normalizarYValidarRango(filtros);

    const ninera = await this.disponibilidadRepository.obtenerResumenNinera(idNinera);
    if (!ninera) {
      throw new NotFoundError('La niñera solicitada no existe.');
    }

    const [bloquesDisponibilidad, reservasActivas] = await Promise.all([
      this.disponibilidadRepository.listarDisponibilidadPorRango(
        idNinera,
        fechaDesde,
        fechaHasta,
      ),
      this.disponibilidadRepository.listarReservasActivasPorRango(
        idNinera,
        fechaDesde,
        fechaHasta,
      ),
    ]);

    const disponibilidadPorFecha =
      this.estrategiaCalculo.resolverHorariosPorRango({
        bloquesDisponibilidad,
        reservasActivas,
        fechaDesde,
        fechaHasta,
      });
    const fechasDisponibles = Object.keys(disponibilidadPorFecha).sort();

    return {
      ninera: {
        id: ninera.idNinera,
        nombreCompleto: ninera.nombreCompleto,
        tarifaHora: ninera.tarifaHora,
        zona: ninera.zona,
        verificada: ninera.verificada,
      },
      rango: {
        desde: fechaDesde,
        hasta: fechaHasta,
      },
      fechasDisponibles,
      disponibilidadPorFecha,
    };
  }

  async consultarMiDisponibilidad(usuarioSolicitante, filtros = {}) {
    const idNinera = this._validarNineraAutenticada(usuarioSolicitante);
    const { fechaDesde, fechaHasta } = this._normalizarYValidarRango(filtros);
    const [bloques, reservas] = await Promise.all([
      this.disponibilidadRepository.listarDisponibilidadPorRango(idNinera, fechaDesde, fechaHasta),
      this.disponibilidadRepository.listarReservasActivasPorRango(idNinera, fechaDesde, fechaHasta),
    ]);
    return { rango: { desde: fechaDesde, hasta: fechaHasta }, bloques, reservas };
  }

  async crearMiBloque(usuarioSolicitante, datos) {
    const idNinera = this._validarNineraAutenticada(usuarioSolicitante);
    const bloque = this._normalizarYValidarBloque(datos);
    await this._validarBloqueLibre(idNinera, bloque);
    return this.disponibilidadRepository.crearBloque(idNinera, bloque);
  }

  async actualizarMiBloque(usuarioSolicitante, idDisponibilidadParam, datos) {
    const idNinera = this._validarNineraAutenticada(usuarioSolicitante);
    const idDisponibilidad = this._validarIdBloque(idDisponibilidadParam);
    const actual = await this.disponibilidadRepository.obtenerBloquePropio(idNinera, idDisponibilidad);
    if (!actual) throw new NotFoundError('El horario no existe o no te pertenece.');

    await this._validarSinReservaEnBloque(idNinera, actual);
    const bloque = this._normalizarYValidarBloque(datos);
    await this._validarBloqueLibre(idNinera, bloque, idDisponibilidad);
    return this.disponibilidadRepository.actualizarBloquePropio(idNinera, idDisponibilidad, bloque);
  }

  async eliminarMiBloque(usuarioSolicitante, idDisponibilidadParam) {
    const idNinera = this._validarNineraAutenticada(usuarioSolicitante);
    const idDisponibilidad = this._validarIdBloque(idDisponibilidadParam);
    const actual = await this.disponibilidadRepository.obtenerBloquePropio(idNinera, idDisponibilidad);
    if (!actual) throw new NotFoundError('El horario no existe o no te pertenece.');

    await this._validarSinReservaEnBloque(idNinera, actual);
    await this.disponibilidadRepository.eliminarBloquePropio(idNinera, idDisponibilidad);
    return { id: idDisponibilidad };
  }

  _validarNineraAutenticada(usuario) {
    if (!usuario?.id) throw new UnauthorizedError('Debes iniciar sesión para gestionar tu disponibilidad.');
    if (usuario.tipo_usuario !== 'NINERA') {
      throw new ForbiddenError('Solo las niñeras pueden gestionar su disponibilidad.');
    }
    return Number(usuario.id);
  }

  _validarIdBloque(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El identificador del horario no es válido.', { idDisponibilidad: 'Debe ser un número entero positivo.' });
    }
    return id;
  }

  _normalizarYValidarBloque({ fecha, horaInicio, horaFin, repetirSemanal = false } = {}) {
    const fechaNormalizada = String(fecha || '').trim();
    const inicio = String(horaInicio || '').trim();
    const fin = String(horaFin || '').trim();
    const errores = {};
    if (!esFechaValidaISO(fechaNormalizada)) errores.fecha = 'Selecciona una fecha válida.';
    else if (fechaNormalizada < fechaLocalISO()) errores.fecha = 'No puedes registrar horarios en fechas pasadas.';
    if (!REGEX_HORA.test(inicio)) errores.horaInicio = 'Usa el formato HH:MM.';
    if (!REGEX_HORA.test(fin)) errores.horaFin = 'Usa el formato HH:MM.';
    if (!errores.horaInicio && !errores.horaFin) {
      const duracion = minutos(fin) - minutos(inicio);
      if (duracion < 30) errores.horaFin = 'El horario debe durar al menos 30 minutos.';
    }
    if (Object.keys(errores).length) throw new ValidationError('Revisa los datos del horario.', errores);
    const diaSemana = repetirSemanal ? nombreDiaSemana(fechaNormalizada) : null;
    return {
      fecha: diaSemana ? null : fechaNormalizada,
      // Conserva la fecha elegida solo durante esta operación para validar la
      // recurrencia contra reservas futuras. No se persiste como fecha puntual.
      fechaInicio: fechaNormalizada,
      horaInicio: inicio,
      horaFin: fin,
      diaSemana,
    };
  }

  async _validarBloqueLibre(idNinera, bloque, idExcluir = null) {
    const fechaReferencia = bloque.fechaInicio || bloque.fecha;
    const fechaHasta = bloque.diaSemana
      ? sumarDiasISO(fechaReferencia, MAX_DIAS_RANGO - 1)
      : fechaReferencia;
    const [bloques, reservasEnRango, reservasRecurrentes] = await Promise.all([
      this.disponibilidadRepository.listarDisponibilidadPorRango(idNinera, fechaReferencia, fechaHasta),
      this.disponibilidadRepository.listarReservasActivasPorRango(idNinera, fechaReferencia, fechaHasta),
      bloque.diaSemana
        ? this.disponibilidadRepository.listarReservasActivasPorDiaSemana(idNinera, bloque.diaSemana, fechaReferencia)
        : Promise.resolve([]),
    ]);
    const seCruzaConBloque = bloques.some((existente) => {
      if (Number(existente.id) === Number(idExcluir)
        || !existente.seSolapaCon(bloque.horaInicio, bloque.horaFin)) return false;

      // Un bloque recurrente afecta únicamente las fechas del mismo día de semana.
      // Para uno puntual, el repositorio ya limita los registros al día solicitado.
      return !bloque.diaSemana
        || (!existente.diaSemana && nombreDiaSemana(existente.fecha) === bloque.diaSemana)
        || existente.diaSemana === bloque.diaSemana;
    });
    if (seCruzaConBloque) {
      throw new ValidationError('Ese horario se cruza con otro bloque de tu disponibilidad.', { horario: 'Elige un rango que no se superponga.' });
    }
    const reservas = bloque.diaSemana ? reservasRecurrentes : reservasEnRango;
    const seCruzaConReserva = reservas.some((reserva) => seSolapan(
      reserva.horaInicio, reserva.horaFin, bloque.horaInicio, bloque.horaFin,
    ));
    if (seCruzaConReserva) {
      throw new ValidationError('Ese horario ya tiene una reserva activa.', { horario: 'No puedes habilitar un horario que se cruza con un servicio reservado.' });
    }
  }

  async _validarSinReservaEnBloque(idNinera, bloque) {
    const desde = bloque.fecha || fechaLocalISO();
    const reservas = bloque.diaSemana
      ? await this.disponibilidadRepository.listarReservasActivasPorDiaSemana(idNinera, bloque.diaSemana, desde)
      : await this.disponibilidadRepository.listarReservasActivasPorRango(idNinera, desde, desde);
    const seCruzaConReserva = reservas.some((reserva) => seSolapan(
      reserva.horaInicio, reserva.horaFin, bloque.horaInicio, bloque.horaFin,
    ));
    if (seCruzaConReserva) {
      throw new ValidationError('No puedes modificar este horario porque tiene una reserva activa.', { horario: 'El servicio reservado debe conservar su horario.' });
    }
  }

  _normalizarYValidarRango({ desde, hasta } = {}) {
    const rangoPorDefecto = obtenerRangoMesActualUTC();
    const fechaDesde = desde ? String(desde).trim() : rangoPorDefecto.desde;
    const fechaHasta = hasta ? String(hasta).trim() : rangoPorDefecto.hasta;

    const errores = {};

    if (!esFechaValidaISO(fechaDesde)) {
      errores.desde = 'La fecha inicial debe tener formato válido YYYY-MM-DD.';
    }
    if (!esFechaValidaISO(fechaHasta)) {
      errores.hasta = 'La fecha final debe tener formato válido YYYY-MM-DD.';
    }

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('El rango de fechas de consulta no es válido.', errores);
    }

    const msDesde = Date.parse(`${fechaDesde}T00:00:00.000Z`);
    const msHasta = Date.parse(`${fechaHasta}T00:00:00.000Z`);

    if (msDesde > msHasta) {
      throw new ValidationError('La fecha inicial no puede ser mayor que la fecha final.', {
        rango: 'El parámetro "desde" debe ser anterior o igual a "hasta".',
      });
    }

    const diferenciaDias = Math.round((msHasta - msDesde) / (1000 * 60 * 60 * 24)) + 1;
    if (diferenciaDias > MAX_DIAS_RANGO) {
      throw new ValidationError(
        `El rango de consulta no puede exceder los ${MAX_DIAS_RANGO} días.`,
        { rango: `Máximo permitido: ${MAX_DIAS_RANGO} días por consulta.` },
      );
    }

    return { fechaDesde, fechaHasta };
  }
}

function esFechaValidaISO(fechaStr) {
  if (!REGEX_FECHA_ISO.test(fechaStr)) return false;
  const fecha = new Date(`${fechaStr}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === fechaStr;
}

function obtenerRangoMesActualUTC() {
  const hoy = new Date();
  const anio = hoy.getUTCFullYear();
  const mes = hoy.getUTCMonth();
  const primerDia = new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 10);
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).toISOString().slice(0, 10);
  return { desde: primerDia, hasta: ultimoDia };
}

function minutos(hora) {
  const [horas, mins] = hora.split(':').map(Number);
  return horas * 60 + mins;
}

function seSolapan(inicioA, finA, inicioB, finB) {
  return inicioA < finB && inicioB < finA;
}

function fechaLocalISO() {
  const ahora = new Date();
  const zona = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - zona).toISOString().slice(0, 10);
}

function nombreDiaSemana(fecha) {
  return ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][new Date(`${fecha}T00:00:00.000Z`).getUTCDay()];
}

function sumarDiasISO(fecha, dias) {
  const resultado = new Date(`${fecha}T00:00:00.000Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

module.exports = ServicioDisponibilidad;

