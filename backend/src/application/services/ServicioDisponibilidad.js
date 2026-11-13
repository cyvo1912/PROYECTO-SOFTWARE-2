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

    // ===== DIAGNÓSTICO 1: DATOS RECUPERADOS DE NEON =====
    if (idNinera === 44) {
      console.log('=== DIAGNÓSTICO NIÑERA 44 ===');
      console.log('Rango consultado:', fechaDesde, fechaHasta);

      console.log(
        'Bloques recuperados:',
        JSON.stringify(bloquesDisponibilidad, null, 2)
      );

      console.log(
        'Reservas activas:',
        JSON.stringify(reservasActivas, null, 2)
      );
    }
    // ===== FIN DEL DIAGNÓSTICO 1 =====

    const disponibilidadPorFecha =
      this.estrategiaCalculo.resolverHorariosPorRango({
        bloquesDisponibilidad,
        reservasActivas,
        fechaDesde,
        fechaHasta,
      });
      // ===== DIAGNÓSTICO 2: HORARIOS CALCULADOS =====
    if (idNinera === 44) {
      console.log(
        'Horarios calculados para 2026-11-16:',
        disponibilidadPorFecha['2026-11-16'] || []
      );
    }
    // ===== FIN DEL DIAGNÓSTICO 2 =====

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

module.exports = ServicioDisponibilidad;

