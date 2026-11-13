const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioDisponibilidad = require('../src/application/services/ServicioDisponibilidad');
const DisponibilidadRepositoryPort = require('../src/application/ports/DisponibilidadRepositoryPort');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../src/domain/errors/DomainErrors');

/**
 * DAO en Memoria (implementa DisponibilidadRepositoryPort para pruebas unitarias, SOLID DIP).
 */
class DisponibilidadRepositoryEnMemoria extends DisponibilidadRepositoryPort {
  constructor() {
    super();
    this.nineras = new Map();
    this.bloques = [];
    this.reservas = [];
  }

  async obtenerResumenNinera(idNinera) {
    return this.nineras.get(idNinera) || null;
  }

  async listarDisponibilidadPorRango(idNinera, _fechaDesde, _fechaHasta) {
    return this.bloques.filter((b) => b.idNinera === idNinera);
  }

  async listarReservasActivasPorRango(idNinera, _fechaDesde, _fechaHasta) {
    return this.reservas.filter((r) => r.idNinera === idNinera);
  }
}

const USUARIO_FAMILIA = { id: 10, tipo_usuario: 'FAMILIA' };
const ID_NINERA = 5;

describe('ServicioDisponibilidad', () => {
  let repositorio;
  let servicio;

  beforeEach(() => {
    repositorio = new DisponibilidadRepositoryEnMemoria();
    repositorio.nineras.set(ID_NINERA, {
      idNinera: ID_NINERA,
      nombreCompleto: 'Valeria Gómez',
      estadoCuenta: 'ACTIVA',
      tarifaHora: 20,
      zona: 'Miraflores',
      verificada: true,
    });
    servicio = new ServicioDisponibilidad({ disponibilidadRepository: repositorio });
  });

  test('proyecta horarios por fecha puntual y día de semana excluyendo reservas solapadas', async () => {
    // 2026-11-09 es LUNES, 2026-11-10 es MARTES
    repositorio.bloques = [
      new Disponibilidad({
        id: 1,
        idNinera: ID_NINERA,
        diaSemana: 'LUNES',
        horaInicio: '08:00:00',
        horaFin: '12:00:00',
        estado: 'Disponible',
      }),
      new Disponibilidad({
        id: 2,
        idNinera: ID_NINERA,
        diaSemana: 'LUNES',
        horaInicio: '14:00:00',
        horaFin: '18:00:00',
        estado: 'Disponible',
      }),
      new Disponibilidad({
        id: 3,
        idNinera: ID_NINERA,
        fecha: '2026-11-10',
        horaInicio: '09:00:00',
        horaFin: '13:00:00',
        estado: 'Disponible',
      }),
    ];

    // Reserva el lunes 2026-11-09 de 15:00 a 17:00 (solapa el bloque 14:00-18:00)
    repositorio.reservas = [
      {
        idReserva: 100,
        idNinera: ID_NINERA,
        fechaReserva: '2026-11-09',
        horaInicio: '15:00',
        horaFin: '17:00',
        estadoReserva: 'Confirmada',
      },
    ];

    const resultado = await servicio.consultarDisponibilidad(USUARIO_FAMILIA, ID_NINERA, {
      desde: '2026-11-09',
      hasta: '2026-11-11',
    });

    assert.deepEqual(resultado.fechasDisponibles, ['2026-11-09', '2026-11-10']);
    assert.equal(resultado.disponibilidadPorFecha['2026-11-09'].length, 1);
    assert.equal(resultado.disponibilidadPorFecha['2026-11-09'][0].horaInicio, '08:00');
    assert.equal(resultado.disponibilidadPorFecha['2026-11-10'][0].horaInicio, '09:00');
  });

  test('exige usuario autenticado y rechaza rangos o identificadores inválidos', async () => {
    await assert.rejects(
      servicio.consultarDisponibilidad({ id: ID_NINERA, tipo_usuario: 'NINERA' }, ID_NINERA, {
        desde: '2026-11-01',
        hasta: '2026-11-10',
      }),
      ForbiddenError,
    );

    await assert.rejects(
      servicio.consultarDisponibilidad(null, ID_NINERA, {
        desde: '2026-11-01',
        hasta: '2026-11-10',
      }),
      UnauthorizedError,
    );

    await assert.rejects(
      servicio.consultarDisponibilidad(USUARIO_FAMILIA, 'abc', {
        desde: '2026-11-01',
        hasta: '2026-11-10',
      }),
      ValidationError,
    );

    await assert.rejects(
      servicio.consultarDisponibilidad(USUARIO_FAMILIA, ID_NINERA, {
        desde: '2026-11-15',
        hasta: '2026-11-01',
      }),
      ValidationError,
    );

    await assert.rejects(
      servicio.consultarDisponibilidad(USUARIO_FAMILIA, 999, {
        desde: '2026-11-01',
        hasta: '2026-11-10',
      }),
      NotFoundError,
    );
  });
});

