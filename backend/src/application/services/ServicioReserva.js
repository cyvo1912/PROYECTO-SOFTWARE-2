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
const ProcesadorPagoSimulado = require('../../domain/services/ProcesadorPagoSimulado');
const { randomUUID } = require('crypto');

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
    ofertaTrabajoRepository = null,
    disponibilidadRepository,
    hijoRepository,
    servicioNotificacion = null,
    estrategiaTarifa = new TarifaPorHora(),
    estrategiaDisponibilidad = new EstrategiaDisponibilidadRangoFechas(),
    reloj = () => new Date(),
    procesadorPago = new ProcesadorPagoSimulado({ reloj }),
  }) {
    if (!reservaRepository) throw new Error('reservaRepository es requerido en ServicioReserva');
    if (!disponibilidadRepository) throw new Error('disponibilidadRepository es requerido en ServicioReserva');
    if (!hijoRepository) throw new Error('hijoRepository es requerido en ServicioReserva');
    this.reservaRepository = reservaRepository;
    this.ofertaTrabajoRepository = ofertaTrabajoRepository;
    this.disponibilidadRepository = disponibilidadRepository;
    this.hijoRepository = hijoRepository;
    this.servicioNotificacion = servicioNotificacion;
    this.estrategiaTarifa = estrategiaTarifa;
    this.estrategiaDisponibilidad = estrategiaDisponibilidad;
    this.procesadorPago = procesadorPago;
    this.reloj = reloj;
  }

  /**
   * Calcula el monto sin guardar nada (para mostrarlo antes de confirmar).
   */
  async cotizar(usuario, datos = {}) {
    this._exigirFamilia(usuario);
    const solicitud = this._validarSolicitud(datos, { exigirDireccion: false });
    const ninera = await this._obtenerNineraActiva(solicitud.idNinera);
    const tarifa = this._calcularTarifa(ninera.tarifaHora, solicitud.horaInicio, solicitud.horaFin);
    const fechas = fechasDelRango(solicitud.fecha, datos.fechaHasta || solicitud.fecha);
    if (fechas.length === 1) return tarifa;
    return { ...tarifa, dias: fechas.length, montoTotal: Math.round(tarifa.montoTotal * fechas.length * 100) / 100 };
  }

  async solicitarRango(usuario, datos = {}) {
    this._exigirFamilia(usuario);
    const solicitud = this._validarSolicitud(datos, { exigirDireccion: true });
    const fechas = fechasDelRango(solicitud.fecha, datos.fechaHasta);
    if (fechas.length < 2) throw new ValidationError('Selecciona al menos dos fechas.');
    const [ninera, hijo] = await Promise.all([this._obtenerNineraActiva(solicitud.idNinera), solicitud.idHijo ? this.hijoRepository.findById(solicitud.idHijo) : null]);
    if (solicitud.idHijo && (!hijo || !hijo.perteneceA(usuario.id))) throw new ForbiddenError('Selecciona un hijo de tu familia.');
    const tarifa = this._calcularTarifa(ninera.tarifaHora, solicitud.horaInicio, solicitud.horaFin);
    const expiraEn = new Date(this.reloj().getTime() + MINUTOS_PARA_PAGAR * 60000);
    const reservas = fechas.map((fecha) => new Reserva({ idPadre: Number(usuario.id), idNinera: solicitud.idNinera,
      idHijo: solicitud.idHijo, fechaReserva: fecha, horaInicio: solicitud.horaInicio, horaFin: solicitud.horaFin,
      direccion: solicitud.direccion, comentario: solicitud.comentario, ...tarifa, expiraEn }));
    const bloques = await this.disponibilidadRepository.listarDisponibilidadPorRango(solicitud.idNinera, fechas[0], fechas[fechas.length - 1]);
    const agenda = this.estrategiaDisponibilidad.resolverHorariosPorRango({ bloquesDisponibilidad: bloques, reservasActivas: [], fechaDesde: fechas[0], fechaHasta: fechas[fechas.length - 1] });
    const sinDisponibilidad = fechas.find((fecha) => !(agenda[fecha] || []).some((s) => s.horaInicio <= solicitud.horaInicio && solicitud.horaFin <= s.horaFin));
    if (sinDisponibilidad) throw new ValidationError(`No hay disponibilidad para el ${sinDisponibilidad.split('-').reverse().join('/')}.`);
    const guardadas = await this.reservaRepository.crearRango(reservas, randomUUID());
    if (!guardadas) throw new ConflictoHorarioError('Al menos una fecha ya no está disponible. Actualiza la búsqueda.');
    const primera = guardadas[0];
    primera.fechaHasta = fechas[fechas.length - 1];
    primera.dias = fechas.length;
    primera.montoPago = Math.round(tarifa.montoTotal * fechas.length * 100) / 100;
    primera.segundosParaPagar = Math.max(0, Math.round((expiraEn.getTime() - this.reloj().getTime()) / 1000));
    await this._notificarNuevaReserva(primera);
    return primera;
  }

  async cancelarFechas(usuario, grupo, fechas) {
    this._exigirFamilia(usuario);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(grupo)) || !Array.isArray(fechas) || !fechas.length || fechas.length > 31 || fechas.some((f) => !esFechaValidaISO(f)) || new Set(fechas).size !== fechas.length) throw new ValidationError('Selecciona fechas válidas.');
    const canceladas = await this.reservaRepository.cancelarFechas(grupo, Number(usuario.id), fechas);
    if (!canceladas) throw new ConflictError('No se pudieron cancelar las fechas seleccionadas. Revisa su estado y plazo de cancelación.');
    for (const reserva of canceladas) await this._notificarCambio(reserva, reserva.idNinera);
    return canceladas;
  }

  async solicitarDesdePostulacion(usuario, idOfertaParam, idPostulacionParam, datos = {}) {
    this._exigirFamilia(usuario);
    const idOferta = Number(idOfertaParam);
    const idPostulacion = Number(idPostulacionParam);
    if (!Number.isInteger(idOferta) || idOferta <= 0 || !Number.isInteger(idPostulacion) || idPostulacion <= 0) {
      throw new ValidationError('La oferta o postulación no es válida.');
    }
    const oferta = await this.ofertaTrabajoRepository.findById(idOferta);
    if (!oferta || Number(oferta.idPadre) !== Number(usuario.id)) throw new NotFoundError('La oferta no existe.');
    const postulantes = await this.ofertaTrabajoRepository.listarPostulantes(idOferta, Number(usuario.id));
    const postulacion = postulantes.find((p) => Number(p.id) === idPostulacion);
    if (!postulacion) throw new NotFoundError('La postulación no existe.');
    if (oferta.estado !== 'ABIERTA' || postulacion.estado !== 'PENDIENTE') throw new ConflictError('La oferta o postulación ya no está disponible.');
    const solicitud = this._validarSolicitud({ idNinera: postulacion.idNinera, fecha: oferta.fechaInicio,
      horaInicio: oferta.horaInicio, horaFin: oferta.horaFin, direccion: datos.direccion }, { exigirDireccion: true });
    await this._obtenerNineraActiva(solicitud.idNinera);
    const nueva = new Reserva({ idPadre: Number(usuario.id), idNinera: solicitud.idNinera,
      fechaReserva: solicitud.fecha, horaInicio: solicitud.horaInicio, horaFin: solicitud.horaFin,
      direccion: solicitud.direccion, comentario: `Oferta: ${oferta.titulo}` });
    Object.assign(nueva, this._calcularTarifa(oferta.tarifaHora, nueva.horaInicio, nueva.horaFin));
    nueva.expiraEn = new Date(this.reloj().getTime() + MINUTOS_PARA_PAGAR * 60000);
    const guardada = await this.reservaRepository.crearDesdePostulacion(nueva, idOferta, idPostulacion);
    if (!guardada) throw new ConflictError('La oferta ya tiene una reserva pendiente de pago o el horario no está disponible.');
    guardada.segundosParaPagar = Math.max(0, Math.round((guardada.expiraEn.getTime() - this.reloj().getTime()) / 1000));
    await this._notificarNuevaReserva(guardada);
    return guardada;
  }

  /**
   * Registra la solicitud de reserva en estado "Pendiente".
   */
  async solicitar(usuario, datos = {}) {
    this._exigirFamilia(usuario);
    const solicitud = this._validarSolicitud(datos, { exigirDireccion: true });
    // Ejecución paralela de consultas independientes para mínima latencia DB
    const [ninera, hijo, reservasNinera, reservasHijo] = await Promise.all([
      this._obtenerNineraActiva(solicitud.idNinera),
      solicitud.idHijo ? this.hijoRepository.findById(solicitud.idHijo) : Promise.resolve(null),
      this.reservaRepository.listarActivasDeNineraEnFecha(solicitud.idNinera, solicitud.fecha),
      solicitud.idHijo
        ? this.reservaRepository.listarActivasDeHijoEnFecha(solicitud.idHijo, solicitud.fecha)
        : Promise.resolve([]),
    ]);

    if (solicitud.idHijo) {
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
    const ahora = this.reloj();
    const choqueNinera = reservasNinera.find((r) => r.estaActiva(ahora) && nueva.seSolapaCon(r));
    if (choqueNinera) {
      throw new ConflictoHorarioError(
        `La niñera ya tiene una reserva de ${choqueNinera.horaInicio} a ${choqueNinera.horaFin} ese día. Elige otro horario.`,
      );
    }

    // 2) Solapamiento con otras reservas del mismo niño
    if (solicitud.idHijo) {
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
    // sin alterar la entidad recuperada desde el repositorio.
    const pendientesGrupo = new Map();
    for (const r of reservas) if (r.grupoReserva && r.estaPendiente() && !r.estaExpirada(ahora)) {
      const previo = pendientesGrupo.get(r.grupoReserva) || { monto: 0, dias: 0 };
      pendientesGrupo.set(r.grupoReserva, { monto: previo.monto + Number(r.montoTotal), dias: previo.dias + 1 });
    }
    return reservas.map((r) => {
      if (r.grupoReserva && pendientesGrupo.has(r.grupoReserva)) {
        const grupo = pendientesGrupo.get(r.grupoReserva);
        r.montoPago = Math.round(grupo.monto * 100) / 100;
        r.diasPago = grupo.dias;
      }
      if (!r.estaExpirada(ahora)) return r;
      return Object.assign(Object.create(Object.getPrototypeOf(r)), r, {
        estadoReserva: 'Expirada',
      });
    });
  }


  /**
   * HU18 - Cambiar el estado de una reserva
   * y notificar al usuario correspondiente.
   */
  async cambiarEstado(usuario, idReservaParam, nuevoEstado) {
    if (!usuario?.id) {
      throw new UnauthorizedError('Debes iniciar sesión.');
    }

    const rol = usuario.tipo_usuario || usuario.rol;

    if (!['FAMILIA', 'NINERA'].includes(rol)) {
      throw new ForbiddenError(
        'No tienes permiso para gestionar reservas.'
      );
    }

    const idReserva = Number(idReservaParam);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      throw new ValidationError(
        'El identificador de reserva no es válido.'
      );
    }

    const estado = String(nuevoEstado || '')
      .trim()
      .toUpperCase();

    if (!['ACEPTADA', 'RECHAZADA', 'CANCELADA', 'COMPLETADA'].includes(estado)) {
      throw new ValidationError(
        'El estado solicitado no es válido.'
      );
    }

    const reserva = await this.reservaRepository.buscarPorId(idReserva);

    if (!reserva) {
      throw new NotFoundError('La reserva no existe.');
    }

    const esFamiliaPropietaria =
      rol === 'FAMILIA' &&
      Number(reserva.idPadre) === Number(usuario.id);

    const esNineraAsignada =
      rol === 'NINERA' &&
      Number(reserva.idNinera) === Number(usuario.id);

    if (!esFamiliaPropietaria && !esNineraAsignada) {
      throw new ForbiddenError(
        'No tienes permiso para modificar esta reserva.'
      );
    }


    const actual = String(reserva.estadoReserva || '')
      .trim()
      .toUpperCase();

    // HU18: impedir cambios en reservas expiradas
    if (reserva.estaExpirada(this.reloj())) {
      throw new ConflictError(
        'La reserva expiró porque no se confirmó el pago a tiempo.'
      );
    }

    // MAIN: validar el plazo permitido para cancelar
    if (
      esFamiliaPropietaria &&
      estado === 'CANCELADA' &&
      ['PENDIENTE', 'PAGADA', 'ACEPTADA'].includes(actual)
    ) {
      if (!reserva.puedeCancelarse(this.reloj())) {
        throw new ValidationError(
          'Una reserva solo puede cancelarse hasta una hora antes del inicio programado.',
          { estado: 'El plazo de cancelación ya venció.' }
        );
      }
    }


    let estadoNuevo = null;
    let idReceptor = null;

    // La familia puede cancelar antes de que el servicio se complete.
    if (
      esFamiliaPropietaria &&
      estado === 'CANCELADA' &&
      ['PENDIENTE', 'PAGADA', 'ACEPTADA'].includes(actual)
    ) {
      estadoNuevo = 'Cancelada';
      idReceptor = reserva.idNinera;
    }

    // La niñera decide únicamente después de que la familia confirmó el pago.
    else if (
      esNineraAsignada &&
      actual === 'PAGADA' &&
      ['ACEPTADA', 'RECHAZADA'].includes(estado)
    ) {
      estadoNuevo = estado === 'ACEPTADA'
        ? 'Aceptada'
        : 'Rechazada';

      idReceptor = reserva.idPadre;
    }

    // La niñera puede completar una reserva aceptada
    else if (
      esNineraAsignada &&
      actual === 'ACEPTADA' &&
      estado === 'COMPLETADA'
    ) {
      estadoNuevo = 'Completada';
      idReceptor = reserva.idPadre;
    }

    if (!estadoNuevo) {
      throw new ValidationError(
        'No se permite realizar este cambio de estado.'
      );
    }

    const actualizada = await this._actualizarEstadoSiVigente(
      idReserva,
      estadoNuevo,
      [actual]
    );

    // Notificar únicamente después de actualizar correctamente
    await this._notificarCambio(actualizada, idReceptor);

    return actualizada;
  }

  /**
   * Simulación de Pasarela de Pago: confirma el pago de una reserva pendiente
   * dentro de sus 10 minutos de vigencia. El pago deja la reserva pendiente de
   * aceptación de la niñera; la mensajería se activa tras esa aceptación.
   */
  async pagar(usuario, idReservaParam, solicitudPago = {}) {
    this._exigirFamilia(usuario);
    const idReserva = Number(idReservaParam);
    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      throw new ValidationError('El identificador de reserva no es válido.');
    }
    const reserva = await this.reservaRepository.buscarPorId(idReserva);
    if (!reserva) {
      throw new NotFoundError('La reserva no existe.');
    }
    if (Number(reserva.idPadre) !== Number(usuario.id)) {
      throw new ForbiddenError('No tienes permiso para pagar esta reserva.');
    }
    if (reserva.estaExpirada(this.reloj())) {
      throw new ConflictError('El plazo de 10 minutos para pagar esta reserva ha expirado.');
    }
    const actual = String(reserva.estadoReserva || '').trim().toUpperCase();
    if (actual !== 'PENDIENTE') {
      throw new ConflictError(`La reserva ya se encuentra en estado ${reserva.estadoReserva}.`);
    }

    const grupoPendiente = reserva.grupoReserva ? (await this.reservaRepository.listarGrupo(reserva.grupoReserva, usuario.id)).filter((r) => r.estaPendiente() && !r.estaExpirada(this.reloj())) : [reserva];
    const montoPago = Math.round(grupoPendiente.reduce((total, r) => total + Number(r.montoTotal), 0) * 100) / 100;
    if (solicitudPago.montoEsperado !== undefined && Number(solicitudPago.montoEsperado) !== montoPago) throw new ConflictError('El total cambió. Actualiza la reserva antes de pagar.');
    const comprobante = this.procesadorPago.procesar({
      monto: montoPago,
      metodoPago: solicitudPago.metodoPago,
      datosPago: solicitudPago.datosPago || solicitudPago,
    });

    const actualizada = await this._actualizarEstadoSiVigente(
      idReserva,
      'Pagada',
      ['Pendiente', 'PENDIENTE'], montoPago
    );

    // La niñera recibe la solicitud ya pagada para aceptarla o rechazarla.
    await this._notificarCambio(actualizada, reserva.idNinera);

    return {
      reserva: actualizada,
      pago: comprobante,
      comprobante,
    };
  }

  /**
   * HU18 - Notifica a la familia y a la niñera
   * cuando se registra una nueva solicitud de reserva.
   */
  async _notificarNuevaReserva(reserva) {
    if (!this.servicioNotificacion?.enviarNotificacion) return;

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

  async _actualizarEstadoSiVigente(idReserva, estadoNuevo, estadosEsperados, montoEsperado) {
    const actualizada = await this.reservaRepository.actualizarEstado(idReserva, estadoNuevo, estadosEsperados, montoEsperado);
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
    const estado = String(reserva.estadoReserva || '')
      .trim()
      .toUpperCase();

    const mensajes = {
      PAGADA: {
        titulo: 'Pago confirmado',
        mensaje: `La reserva #${reserva.id} está lista para tu respuesta.`,
      },
      ACEPTADA: {
        titulo: 'Reserva aceptada',
        mensaje: `Tu reserva #${reserva.id} fue aceptada.`,
      },
      RECHAZADA: {
        titulo: 'Reserva rechazada',
        mensaje: `Tu reserva #${reserva.id} fue rechazada.`,
      },
      CANCELADA: {
        titulo: 'Reserva cancelada',
        mensaje: `La reserva #${reserva.id} fue cancelada.`,
      },
      COMPLETADA: {
        titulo: 'Servicio completado',
        mensaje:
          `La reserva #${reserva.id} fue completada. ` +
          'Ya puedes valorar el servicio recibido.',
      },
    };

    const datos = mensajes[estado];

    if (!datos) return;

    try {
      if (this.servicioNotificacion?.enviarNotificacion) {
        await this.servicioNotificacion.enviarNotificacion({
          idUsuario: Number(idReceptor),
          idReserva: Number(reserva.id),
          titulo: datos.titulo,
          mensaje: datos.mensaje,
          tipo: 'RESERVA',
        });
      }
    } catch (error) {
      console.error(
        'HU18: error al notificar cambio de reserva:',
        error
      );
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

function fechasDelRango(desde, hasta) {
  if (!esFechaValidaISO(desde) || !esFechaValidaISO(hasta)) throw new ValidationError('Selecciona las fechas de la reserva.');
  const inicio = Date.parse(`${desde}T00:00:00Z`), fin = Date.parse(`${hasta}T00:00:00Z`);
  const cantidad = Math.round((fin - inicio) / 86400000) + 1;
  if (cantidad < 1 || cantidad > 31) throw new ValidationError('Selecciona un rango de hasta 31 días.');
  return Array.from({ length: cantidad }, (_, i) => new Date(inicio + i * 86400000).toISOString().slice(0, 10));
}

function esFechaValidaISO(fechaStr) {
  if (!REGEX_FECHA_ISO.test(fechaStr)) return false;
  const fecha = new Date(`${fechaStr}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === fechaStr;
}

module.exports = ServicioReserva;
