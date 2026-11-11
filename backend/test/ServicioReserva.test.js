const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioReserva = require('../src/application/services/ServicioReserva');
const ReservaRepositoryPort = require('../src/application/ports/ReservaRepositoryPort');
const DisponibilidadRepositoryPort = require('../src/application/ports/DisponibilidadRepositoryPort');
const Reserva = require('../src/domain/entities/Reserva');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');
const Hijo = require('../src/domain/entities/Hijo');
const {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictoHorarioError,
} = require('../src/domain/errors/DomainErrors');

/** DAOs en memoria (SOLID DIP): el servicio no sabe que no hay base de datos. */
class ReservaRepositoryEnMemoria extends ReservaRepositoryPort {
  constructor(relojDePrueba) {
    super();
    this.reservas = [];
    this.siguienteId = 1;
    this.reloj = relojDePrueba; // simula el NOW() de PostgreSQL
  }
  async listarActivasDeNineraEnFecha(idNinera, fecha) {
    return this.reservas.filter((r) => r.idNinera === idNinera && r.fechaReserva === fecha && r.estaActiva(this.reloj()));
  }
  async listarActivasDeHijoEnFecha(idHijo, fecha) {
    return this.reservas.filter((r) => r.idHijo === idHijo && r.fechaReserva === fecha && r.estaActiva(this.reloj()));
  }
  async crearSiNoHaySolapamiento(reserva) {
    const choque = this.reservas.some(
      (r) => r.idNinera === reserva.idNinera && r.estaActiva(this.reloj()) && reserva.seSolapaCon(r),
    );
    if (choque) return null;
    const guardada = new Reserva({ ...reserva, id: this.siguienteId++ });
    this.reservas.push(guardada);
    return guardada;
  }
  async listarPorPadre(idPadre) {
    return this.reservas.filter((r) => r.idPadre === idPadre);
  }
}

class DisponibilidadRepositoryEnMemoria extends DisponibilidadRepositoryPort {
  constructor() {
    super();
    this.nineras = new Map();
    this.bloques = [];
  }
  async obtenerResumenNinera(idNinera) {
    return this.nineras.get(idNinera) || null;
  }
  async listarDisponibilidadPorRango(idNinera) {
    return this.bloques.filter((b) => b.idNinera === idNinera);
  }
}

class HijoRepositoryEnMemoria {
  constructor() {
    this.hijos = new Map();
  }
  async findById(id) {
    return this.hijos.get(id) || null;
  }
}

const FAMILIA = { id: 10, tipo_usuario: 'FAMILIA' };
const OTRA_FAMILIA = { id: 11, tipo_usuario: 'FAMILIA' };
const ID_NINERA = 5;
const LUNES = '2026-11-16';
// "Ahora" controlable: empieza el martes 10/11/2026 10:00 en Lima (15:00 UTC)
const INICIO = new Date('2026-11-10T15:00:00.000Z').getTime();
let minutosTranscurridos = 0;
const reloj = () => new Date(INICIO + minutosTranscurridos * 60 * 1000);

const solicitudBase = (extra = {}) => ({
  idNinera: ID_NINERA,
  idHijo: 1,
  fecha: LUNES,
  horaInicio: '09:00',
  horaFin: '11:30',
  direccion: 'Av. Larco 123, Miraflores',
  ...extra,
});

describe('ServicioReserva', () => {
  let reservas;
  let disponibilidad;
  let hijos;
  let servicio;

  beforeEach(() => {
    minutosTranscurridos = 0;
    reservas = new ReservaRepositoryEnMemoria(reloj);
    disponibilidad = new DisponibilidadRepositoryEnMemoria();
    hijos = new HijoRepositoryEnMemoria();

    disponibilidad.nineras.set(ID_NINERA, {
      idNinera: ID_NINERA,
      nombreCompleto: 'Valeria Gómez',
      estadoCuenta: 'ACTIVA',
      tarifaHora: 20,
      zona: 'Miraflores',
      verificada: true,
    });
    disponibilidad.bloques = [
      new Disponibilidad({ id: 1, idNinera: ID_NINERA, diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '18:00' }),
    ];
    hijos.hijos.set(1, new Hijo({ id: 1, idPadre: FAMILIA.id, nombre: 'Lucía', edad: 4 }));
    hijos.hijos.set(2, new Hijo({ id: 2, idPadre: OTRA_FAMILIA.id, nombre: 'Mateo', edad: 6 }));

    servicio = new ServicioReserva({
      reservaRepository: reservas,
      disponibilidadRepository: disponibilidad,
      hijoRepository: hijos,
      reloj,
    });
  });

  test('cotiza 2 h 30 min a S/. 20 por hora = S/. 50', async () => {
    const cotizacion = await servicio.cotizar(FAMILIA, solicitudBase());
    assert.deepEqual(cotizacion, { tarifaHora: 20, horas: 2.5, montoTotal: 50 });
    assert.equal(reservas.reservas.length, 0, 'cotizar no debe guardar nada');
  });

  test('crea la reserva en estado Pendiente con el monto calculado', async () => {
    const reserva = await servicio.solicitar(FAMILIA, solicitudBase());
    assert.equal(reserva.estadoReserva, 'Pendiente');
    assert.equal(reserva.montoTotal, 50);
    assert.equal(reserva.idPadre, FAMILIA.id);
  });

  test('rechaza un horario que se cruza con otra reserva de la niñera (409)', async () => {
    await servicio.solicitar(OTRA_FAMILIA, solicitudBase({ idHijo: 2, horaInicio: '10:00', horaFin: '12:00' }));
    await assert.rejects(() => servicio.solicitar(FAMILIA, solicitudBase()), ConflictoHorarioError);
  });

  test('permite reservar justo cuando termina la reserva anterior', async () => {
    await servicio.solicitar(OTRA_FAMILIA, solicitudBase({ idHijo: 2, horaInicio: '08:00', horaFin: '09:00' }));
    const reserva = await servicio.solicitar(FAMILIA, solicitudBase({ horaInicio: '09:00', horaFin: '10:00' }));
    assert.equal(reserva.montoTotal, 20);
  });

  test('una reserva cancelada ya no bloquea el horario', async () => {
    reservas.reservas.push(new Reserva({
      id: 99, idPadre: OTRA_FAMILIA.id, idNinera: ID_NINERA, fechaReserva: LUNES,
      horaInicio: '09:00', horaFin: '12:00', estadoReserva: 'Cancelada', direccion: 'x',
    }));
    const reserva = await servicio.solicitar(FAMILIA, solicitudBase());
    assert.ok(reserva.id);
  });

  test('rechaza si el mismo niño ya tiene una reserva cruzada con otra niñera', async () => {
    disponibilidad.nineras.set(6, { idNinera: 6, estadoCuenta: 'ACTIVA', tarifaHora: 25 });
    disponibilidad.bloques.push(
      new Disponibilidad({ id: 2, idNinera: 6, diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '18:00' }),
    );
    await servicio.solicitar(FAMILIA, solicitudBase({ idNinera: 6 }));
    await assert.rejects(() => servicio.solicitar(FAMILIA, solicitudBase()), ConflictoHorarioError);
  });

  test('rechaza un horario fuera de la disponibilidad publicada', async () => {
    await assert.rejects(
      () => servicio.solicitar(FAMILIA, solicitudBase({ horaInicio: '17:00', horaFin: '19:00' })),
      ValidationError,
    );
  });

  test('rechaza duración menor a 1 hora y fin antes del inicio', async () => {
    await assert.rejects(() => servicio.cotizar(FAMILIA, solicitudBase({ horaFin: '09:30' })), ValidationError);
    await assert.rejects(() => servicio.cotizar(FAMILIA, solicitudBase({ horaFin: '08:00' })), ValidationError);
  });

  test('rechaza fechas pasadas', async () => {
    await assert.rejects(() => servicio.cotizar(FAMILIA, solicitudBase({ fecha: '2026-11-09' })), ValidationError);
  });

  test('no permite reservar para el hijo de otra familia', async () => {
    await assert.rejects(() => servicio.solicitar(FAMILIA, solicitudBase({ idHijo: 2 })), ForbiddenError);
  });

  test('responde 404 si la niñera no existe', async () => {
    await assert.rejects(() => servicio.cotizar(FAMILIA, solicitudBase({ idNinera: 999 })), NotFoundError);
  });

  test('separa el horario por 10 minutos para pagar', async () => {
    const reserva = await servicio.solicitar(FAMILIA, solicitudBase());
    assert.equal(reserva.segundosParaPagar, 600);
    assert.equal(reserva.expiraEn.toISOString(), '2026-11-10T15:10:00.000Z');
  });

  test('dentro de los 10 minutos el horario sigue bloqueado', async () => {
    await servicio.solicitar(OTRA_FAMILIA, solicitudBase({ idHijo: 2 }));
    minutosTranscurridos = 9;
    await assert.rejects(() => servicio.solicitar(FAMILIA, solicitudBase()), ConflictoHorarioError);
  });

  test('si pasan los 10 minutos sin pagar, el horario se libera', async () => {
    await servicio.solicitar(OTRA_FAMILIA, solicitudBase({ idHijo: 2 }));
    minutosTranscurridos = 11;
    const reserva = await servicio.solicitar(FAMILIA, solicitudBase());
    assert.equal(reserva.estadoReserva, 'Pendiente');

    const deLaOtraFamilia = await servicio.listarMisReservas(OTRA_FAMILIA);
    assert.equal(deLaOtraFamilia[0].estadoReserva, 'Expirada');
  });

  test('una reserva ya pagada no vence a los 10 minutos', async () => {
    const pagada = await servicio.solicitar(OTRA_FAMILIA, solicitudBase({ idHijo: 2 }));
    pagada.estadoReserva = 'Pagada'; // lo haría la HU de pago
    minutosTranscurridos = 60;
    await assert.rejects(() => servicio.solicitar(FAMILIA, solicitudBase()), ConflictoHorarioError);
  });

  test('si otra familia gana el horario al guardar, responde conflicto', async () => {
    reservas.listarActivasDeNineraEnFecha = async () => []; // simula la carrera
    reservas.reservas.push(new Reserva({
      id: 50, idPadre: OTRA_FAMILIA.id, idNinera: ID_NINERA, fechaReserva: LUNES,
      horaInicio: '10:00', horaFin: '11:00', direccion: 'x',
    }));
    await assert.rejects(() => servicio.solicitar(FAMILIA, solicitudBase({ idHijo: null })), ConflictoHorarioError);
  });
});
