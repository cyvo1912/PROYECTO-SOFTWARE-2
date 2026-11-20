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

  async listarReservasActivasPorDiaSemana(idNinera, dia, fechaDesde) {
    return this.reservas.filter((reserva) => (
      reserva.idNinera === idNinera
      && reserva.fechaReserva >= fechaDesde
      && nombreDiaSemana(reserva.fechaReserva) === dia
    ));
  }

  async obtenerBloquePropio(idNinera, idDisponibilidad) {
    return this.bloques.find((b) => b.idNinera === idNinera && b.id === idDisponibilidad) || null;
  }

  async crearBloque(idNinera, datos) {
    const bloque = new Disponibilidad({ id: this.bloques.length + 10, idNinera, ...datos });
    this.bloques.push(bloque);
    return bloque;
  }

  async actualizarBloquePropio(idNinera, idDisponibilidad, datos) {
    const indice = this.bloques.findIndex((b) => b.idNinera === idNinera && b.id === idDisponibilidad);
    if (indice < 0) return null;
    this.bloques[indice] = new Disponibilidad({ id: idDisponibilidad, idNinera, ...datos });
    return this.bloques[indice];
  }

  async eliminarBloquePropio(idNinera, idDisponibilidad) {
    const totalInicial = this.bloques.length;
    this.bloques = this.bloques.filter((b) => !(b.idNinera === idNinera && b.id === idDisponibilidad));
    return this.bloques.length !== totalInicial;
  }
}

const USUARIO_FAMILIA = { id: 10, tipo_usuario: 'FAMILIA' };
const ID_NINERA = 5;
const USUARIO_NINERA = { id: ID_NINERA, tipo_usuario: 'NINERA' };

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
    assert.equal(resultado.disponibilidadPorFecha['2026-11-09'].length, 3);
    assert.equal(resultado.disponibilidadPorFecha['2026-11-09'][0].horaInicio, '08:00');
    assert.deepEqual(resultado.disponibilidadPorFecha['2026-11-09'].slice(1).map(({ horaInicio, horaFin }) => [horaInicio, horaFin]), [['14:00', '15:00'], ['17:00', '18:00']]);
    assert.equal(resultado.disponibilidadPorFecha['2026-11-10'][0].horaInicio, '09:00');
  });

  const RANGO = { desde: '2026-11-01', hasta: '2026-11-10' };

  test('exige usuario autenticado', async () => {
    await assert.rejects(servicio.consultarDisponibilidad(null, ID_NINERA, RANGO), UnauthorizedError);
  });

  test('una niñera no puede consultar la disponibilidad como familia', async () => {
    await assert.rejects(
      servicio.consultarDisponibilidad({ id: ID_NINERA, tipo_usuario: 'NINERA' }, ID_NINERA, RANGO),
      ForbiddenError,
    );
  });

  test('rechaza un identificador de niñera no numérico', async () => {
    await assert.rejects(servicio.consultarDisponibilidad(USUARIO_FAMILIA, 'abc', RANGO), ValidationError);
  });

  test('rechaza un rango de fechas invertido', async () => {
    await assert.rejects(
      servicio.consultarDisponibilidad(USUARIO_FAMILIA, ID_NINERA, { desde: '2026-11-15', hasta: '2026-11-01' }),
      ValidationError,
    );
  });

  test('responde 404 si la niñera no existe', async () => {
    await assert.rejects(servicio.consultarDisponibilidad(USUARIO_FAMILIA, 999, RANGO), NotFoundError);
  });

  test('la niñera crea, edita y elimina sus propios horarios futuros', async () => {
    const creado = await servicio.crearMiBloque(USUARIO_NINERA, {
      fecha: '2030-11-10', horaInicio: '09:00', horaFin: '12:00',
    });
    assert.equal(creado.horaInicio, '09:00');

    const actualizado = await servicio.actualizarMiBloque(USUARIO_NINERA, creado.id, {
      fecha: '2030-11-10', horaInicio: '10:00', horaFin: '13:00',
    });
    assert.equal(actualizado.horaInicio, '10:00');

    await servicio.eliminarMiBloque(USUARIO_NINERA, creado.id);
    assert.equal(repositorio.bloques.length, 0);
  });

  test('no permite crear ni retirar una disponibilidad semanal que se cruce con una reserva futura', async () => {
    repositorio.reservas = [{
      idNinera: ID_NINERA,
      fechaReserva: '2030-11-18', // lunes
      horaInicio: '10:00',
      horaFin: '12:00',
    }];

    await assert.rejects(
      servicio.crearMiBloque(USUARIO_NINERA, {
        fecha: '2030-11-11', horaInicio: '09:00', horaFin: '11:00', repetirSemanal: true,
      }),
      ValidationError,
    );

    repositorio.reservas = [];
    const recurrente = await servicio.crearMiBloque(USUARIO_NINERA, {
      fecha: '2030-11-11', horaInicio: '09:00', horaFin: '11:00', repetirSemanal: true,
    });
    assert.equal(recurrente.fecha, null);
    assert.equal(recurrente.diaSemana, 'LUNES');

    repositorio.reservas = [{
      idNinera: ID_NINERA,
      fechaReserva: '2030-11-25',
      horaInicio: '10:00',
      horaFin: '11:00',
    }];
    await assert.rejects(servicio.eliminarMiBloque(USUARIO_NINERA, recurrente.id), ValidationError);
  });

  test('no permite horarios que se crucen entre sí ni con una reserva activa', async () => {
    repositorio.bloques = [new Disponibilidad({
      id: 70, idNinera: ID_NINERA, fecha: '2030-11-10', horaInicio: '09:00', horaFin: '12:00',
    })];
    await assert.rejects(
      servicio.crearMiBloque(USUARIO_NINERA, { fecha: '2030-11-10', horaInicio: '11:00', horaFin: '14:00' }),
      ValidationError,
    );

    repositorio.bloques = [];
    repositorio.reservas = [{ idNinera: ID_NINERA, fechaReserva: '2030-11-10', horaInicio: '10:00', horaFin: '12:00' }];
    await assert.rejects(
      servicio.crearMiBloque(USUARIO_NINERA, { fecha: '2030-11-10', horaInicio: '09:00', horaFin: '11:00' }),
      ValidationError,
    );
  });

  test('solo una niñera puede gestionar su disponibilidad', async () => {
    await assert.rejects(
      servicio.crearMiBloque(USUARIO_FAMILIA, { fecha: '2030-11-10', horaInicio: '09:00', horaFin: '12:00' }),
      ForbiddenError,
    );
  });
});

function nombreDiaSemana(fecha) {
  return ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][new Date(`${fecha}T00:00:00.000Z`).getUTCDay()];
}
