const Reserva = require('../../domain/entities/Reserva');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ConflictoHorarioError,
} = require('../../domain/errors/DomainErrors');
const { TarifaPorHora } = require('../../domain/strategies/EstrategiaCalculoTarifa');
const {
  EstrategiaDisponibilidadRangoFechas,
} = require('../../domain/strategies/EstrategiaCalculoDisponibilidad');

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DURACION_MINIMA_MIN = 60; // 1 hora
const DURACION_MAXIMA_MIN = 12 * 60; // 12 horas
const DESFASE_LIMA_MS = -5 * 60 * 60 * 1000; // Perú: UTC-5, sin horario de verano
const MINUTOS_PARA_PAGAR = 10; // El horario queda separado 10 min; si no se paga, se libera

/**
 * Servicio de Aplicación: ServicioReserva
 * HU: "Como familia, quiero solicitar reservas con cálculo de tarifa y
 * validación de solapamiento para asegurar atención sin conflictos de horario."
 *
 * SOLID (SRP, DIP) + GRASP (Controlador de caso de uso, Bajo Acoplamiento).
 * Reutiliza el DisponibilidadRepository y la estrategia de la HU13.
 */
class ServicioReserva {
  constructor({
    reservaRepository,
    disponibilidadRepository,
    hijoRepository,
    servicioNotificacion = null,
    estrategiaTarifa = new TarifaPorHora(),
    estrategiaDisponibilidad = new EstrategiaDisponibilidadRangoFechas(),
    notificacionService = null,
    reloj = () => new Date(),
  }) {
    if (!reservaRepository) throw new Error('reservaRepository es requerido en ServicioReserva');
    if (!disponibilidadRepository) throw new Error('disponibilidadRepository es requerido en ServicioReserva');
    if (!hijoRepository) throw new Error('hijoRepository es requerido en ServicioReserva');
    this.reservaRepository = reservaRepository;
    this.disponibilidadRepository = disponibilidadRepository;
    this.hijoRepository = hijoRepository;
    this.servicioNotificacion = servicioNotificacion;
    this.estrategiaTarifa = estrategiaTarifa;
    this.estrategiaDisponibilidad = estrategiaDisponibilidad;
    this.notificacionService = notificacionService;
    this.reloj = reloj;
  }

  /**
   * Calcula el monto sin guardar nada (para mostrarlo antes de confirmar).
   */
  async cotizar(usuario, datos = {}) {
    this._exigirFamilia(usuario);
    const solicitud = this._validarSolicitud(datos, { exigirDireccion: false });
    const ninera = await this._obtenerNineraActiva(solicitud.idNinera);
    return this._calcularTarifa(ninera.tarifaHora, solicitud.horaInicio, solicitud.horaFin);
  }

  /**
   * Registra la solicitud de reserva en estado "Pendiente".
   */
  async solicitar(usuario, datos = {}) {
    this._exigirFamilia(usuario);
    const solicitud = this._validarSolicitud(datos, { exigirDireccion: true });
    const ninera = await this._obtenerNineraActiva(solicitud.idNinera);

    if (solicitud.idHijo) {
      const hijo = await this.hijoRepository.findById(solicitud.idHijo);
      if (!hijo) throw new NotFoundError('El perfil del niño no existe.');
      if (!hijo.perteneceA(usuario.id)) {
        throw new ForbiddenError('Solo puedes reservar para tus propios hijos.');
      }
    }

    const nueva = new Reserva({
      idPadre: Number(usuario.id),
      idNinera: solicitud.idNinera,
      idHijo: solicitud.idHijo,
      fechaReserva: solicitud.fecha,
      horaInicio: solicitud.horaInicio,
      horaFin: solicitud.horaFin,
      direccion: solicitud.direccion,
      comentario: solicitud.comentario,
    });

    // 1) Solapamiento con otras reservas de la niñera
    const reservasNinera = await this.reservaRepository.listarActivasDeNineraEnFecha(
      solicitud.idNinera,
      solicitud.fecha,
    );
    const ahora = this.reloj();
    const choqueNinera = reservasNinera.find((r) => r.estaActiva(ahora) && nueva.seSolapaCon(r));
    if (choqueNinera) {
      throw new ConflictoHorarioError(
        `La niñera ya tiene una reserva de ${choqueNinera.horaInicio} a ${choqueNinera.horaFin} ese día. Elige otro horario.`,
      );
    }

    // 2) Solapamiento con otras reservas del mismo niño
    if (solicitud.idHijo) {
      const reservasHijo = await this.reservaRepository.listarActivasDeHijoEnFecha(
        solicitud.idHijo,
        solicitud.fecha,
      );
      const choqueHijo = reservasHijo.find((r) => r.estaActiva(ahora) && nueva.seSolapaCon(r));
      if (choqueHijo) {
        throw new ConflictoHorarioError(
          `Tu hijo ya tiene una reserva de ${choqueHijo.horaInicio} a ${choqueHijo.horaFin} ese día.`,
        );
      }
    }

    // 3) El horario debe caer dentro de la disponibilidad publicada (HU13)
    await this._validarDentroDeDisponibilidad(nueva);

    // 4) Cálculo de tarifa
    const tarifa = this._calcularTarifa(ninera.tarifaHora, nueva.horaInicio, nueva.horaFin);
    nueva.tarifaHora = tarifa.tarifaHora;
    nueva.horas = tarifa.horas;
    nueva.montoTotal = tarifa.montoTotal;

    // 5) Plazo para pagar: el horario queda separado 10 minutos
    nueva.expiraEn = new Date(ahora.getTime() + MINUTOS_PARA_PAGAR * 60 * 1000);

    // 6) Guardado atómico: si otra familia tomó el horario en este instante, falla
    const guardada = await this.reservaRepository.crearSiNoHaySolapamiento(nueva);
    if (!guardada) {
      throw new ConflictoHorarioError(
        'Otra familia acaba de reservar ese horario. Elige otro horario.',
      );
    }
    // Segundos que le quedan a la familia para pagar (los cuenta la pantalla)
    guardada.segundosParaPagar = Math.max(
      0,
      Math.round((guardada.expiraEn.getTime() - this.reloj().getTime()) / 1000),
    );
    // HU18 - Notificaciones automáticas de nueva reserva
    await this._notificarNuevaReserva(guardada);
    return guardada;
  }

  async listarMisReservas(usuario) {
    if (!usuario || !usuario.id) throw new UnauthorizedError('Debes iniciar sesión para consultar reservas.');
    const ahora = this.reloj();
    const esNinera = usuario.tipo_usuario === 'NINERA';
    const reservas = esNinera
      ? await this.reservaRepository.listarPorNinera(Number(usuario.id))
      : await this.reservaRepository.listarPorPadre(Number(usuario.id));
    // Las pendientes que vencieron sin pago se muestran como "Expirada"
    return reservas.map((r) => {
      if (r.estaExpirada(ahora)) r.estadoReserva = 'Expirada';
      return r;
    });
  }

  /**
   * HU18 - Notifica a la familia y a la niñera
   * cuando se registra una nueva solicitud de reserva.
   */
  async _notificarNuevaReserva(reserva) {
    if (!this.servicioNotificacion) {
      console.warn(
        'HU18: servicioNotificacion no configurado en ServicioReserva.'
      );
      return;
    }

    const datosReserva =
      `${reserva.fechaReserva}, ` +
      `de ${reserva.horaInicio} a ${reserva.horaFin}`;

    const notificaciones = [
      {
        idUsuario: reserva.idPadre,
        idReserva: reserva.id,
        titulo: 'Solicitud de reserva registrada',
        mensaje:
          `Tu solicitud para el ${datosReserva} fue registrada. ` +
          'Tienes 10 minutos para completar el pago.',
        tipo: 'RESERVA',
      },
      {
        idUsuario: reserva.idNinera,
        idReserva: reserva.id,
        titulo: 'Nueva solicitud de reserva',
        mensaje:
          `Recibiste una solicitud de reserva para el ${datosReserva}. ` +
          'Está pendiente de pago.',
        tipo: 'RESERVA',
      },
    ];

    const resultados = await Promise.allSettled(
      notificaciones.map((notificacion) =>
        this.servicioNotificacion.enviarNotificacion(notificacion)
      )
    );

    resultados.forEach((resultado, indice) => {
      if (resultado.status === 'rejected') {
        console.error(
          `HU18: error al notificar al usuario ${notificaciones[indice].idUsuario}:`,
          resultado.reason
        );
      }
    });
  }

  // ---------- Reglas internas ----------

  async _actualizarEstadoSiVigente(idReserva, estadoNuevo, estadosEsperados) {
    const actualizada = await this.reservaRepository.actualizarEstado(idReserva, estadoNuevo, estadosEsperados);
    if (!actualizada) {
      throw new ConflictError('La reserva fue actualizada por otra acción. Recarga el historial e inténtalo nuevamente.');
    }
    return actualizada;
  }

  _exigirFamilia(usuario) {
    if (!usuario || !usuario.id) {
      throw new UnauthorizedError('Debes iniciar sesión para reservar.');
    }
    if (usuario.tipo_usuario && usuario.tipo_usuario !== 'FAMILIA') {
      throw new ForbiddenError('Solo las familias pueden solicitar reservas.');
    }
  }

  _validarSolicitud(datos, { exigirDireccion }) {
    const errores = {};
    const idNinera = Number(datos.idNinera);
    const idHijo = datos.idHijo ? Number(datos.idHijo) : null;
    const fecha = String(datos.fecha || '').trim();
    const horaInicio = String(datos.horaInicio || '').trim().slice(0, 5);
    const horaFin = String(datos.horaFin || '').trim().slice(0, 5);
    const direccion = String(datos.direccion || '').trim();
    const comentario = datos.comentario ? String(datos.comentario).trim() : null;

    if (!Number.isInteger(idNinera) || idNinera <= 0) {
      errores.idNinera = 'Selecciona una niñera válida.';
    }
    if (idHijo !== null && (!Number.isInteger(idHijo) || idHijo <= 0)) {
      errores.idHijo = 'Selecciona un hijo válido.';
    }
    if (!esFechaValidaISO(fecha)) {
      errores.fecha = 'La fecha debe tener formato YYYY-MM-DD.';
    }
    if (!REGEX_HORA.test(horaInicio)) errores.horaInicio = 'La hora de inicio debe tener formato HH:MM.';
    if (!REGEX_HORA.test(horaFin)) errores.horaFin = 'La hora de fin debe tener formato HH:MM.';
    if (exigirDireccion && direccion.length < 5) {
      errores.direccion = 'Ingresa la dirección donde será el cuidado.';
    }
    if (direccion.length > 255) errores.direccion = 'La dirección no puede superar 255 caracteres.';

    if (Object.keys(errores).length > 0) {
      throw new ValidationError('Revisa los datos de la reserva.', errores);
    }

    const minutos = aMinutos(horaFin) - aMinutos(horaInicio);
    if (minutos <= 0) {
      throw new ValidationError('La hora de fin debe ser posterior a la de inicio.', {
        horaFin: 'Debe ser mayor que la hora de inicio.',
      });
    }
    if (minutos < DURACION_MINIMA_MIN) {
      throw new ValidationError('La reserva debe durar al menos 1 hora.', {
        horaFin: 'Duración mínima: 1 hora.',
      });
    }
    if (minutos > DURACION_MAXIMA_MIN) {
      throw new ValidationError('La reserva no puede durar más de 12 horas.', {
        horaFin: 'Duración máxima: 12 horas.',
      });
    }

    const { hoy, horaActual } = this._ahoraEnLima();
    if (fecha < hoy || (fecha === hoy && horaInicio <= horaActual)) {
      throw new ValidationError('No puedes reservar en una fecha u hora que ya pasó.', {
        fecha: 'Elige una fecha y hora futuras.',
      });
    }

    return { idNinera, idHijo, fecha, horaInicio, horaFin, direccion, comentario };
  }

  async _obtenerNineraActiva(idNinera) {
    const ninera = await this.disponibilidadRepository.obtenerResumenNinera(idNinera);
    if (!ninera) throw new NotFoundError('La niñera solicitada no existe.');
    if (ninera.estadoCuenta && ninera.estadoCuenta !== 'ACTIVA') {
      throw new ValidationError('Esta niñera no está recibiendo reservas por ahora.');
    }
    if (!(Number(ninera.tarifaHora) > 0)) {
      throw new ValidationError('La niñera no tiene una tarifa por hora registrada.');
    }
    return ninera;
  }

  async _validarDentroDeDisponibilidad(reserva) {
    const bloques = await this.disponibilidadRepository.listarDisponibilidadPorRango(
      reserva.idNinera,
      reserva.fechaReserva,
      reserva.fechaReserva,
    );
    // Se pasan reservas vacías: el choque con reservas ya se validó arriba
    // con un mensaje más claro. Aquí solo importa el horario publicado.
    const agenda = this.estrategiaDisponibilidad.resolverHorariosPorRango({
      bloquesDisponibilidad: bloques,
      reservasActivas: [],
      fechaDesde: reserva.fechaReserva,
      fechaHasta: reserva.fechaReserva,
    });
    const slots = agenda[reserva.fechaReserva] || [];
    const cabe = slots.some(
      (s) => s.horaInicio <= reserva.horaInicio && reserva.horaFin <= s.horaFin,
    );
    if (!cabe) {
      throw new ValidationError(
        'La niñera no está disponible en ese horario. Revisa su calendario de disponibilidad.',
        { horario: 'Fuera del horario publicado por la niñera.' },
      );
    }
  }

  _calcularTarifa(tarifaHora, horaInicio, horaFin) {
    const minutos = aMinutos(horaFin) - aMinutos(horaInicio);
    return this.estrategiaTarifa.calcular({ tarifaHora, minutos });
  }

  async _notificarCambio(reserva, idReceptor) {
    if (this.notificacionService?.crearNotificacionReserva) {
      await this.notificacionService.crearNotificacionReserva(idReceptor, `La reserva #${reserva.id} ahora está ${reserva.estadoReserva}.`);
    }
  }

  _ahoraEnLima() {
    const lima = new Date(this.reloj().getTime() + DESFASE_LIMA_MS);
    const iso = lima.toISOString();
    return { hoy: iso.slice(0, 10), horaActual: iso.slice(11, 16) };
  }
}

function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function esFechaValidaISO(fechaStr) {
  if (!REGEX_FECHA_ISO.test(fechaStr)) return false;
  const fecha = new Date(`${fechaStr}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === fechaStr;
}

module.exports = ServicioReserva;
