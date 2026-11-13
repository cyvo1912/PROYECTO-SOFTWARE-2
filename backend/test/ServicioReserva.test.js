const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioReserva = require('../src/application/services/ServicioReserva');
const {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} = require('../src/domain/errors/DomainErrors');

class ReservaRepositoryEnMemoria {
  constructor() {
    this.reservas = [
      { id: 1, idPadre: 10, idNinera: 20, estado: 'Pendiente' },
      { id: 2, idPadre: 11, idNinera: 20, estado: 'Aceptada' },
      { id: 3, idPadre: 10, idNinera: 21, estado: 'Completada' },
    ];
  }

  async listarPorUsuario(idUsuario, rol) {
    const columna = rol === 'FAMILIA' ? 'idPadre' : 'idNinera';
    return this.reservas.filter((reserva) => String(reserva[columna]) === String(idUsuario));
  }

  async findById(id) {
    return this.reservas.find((reserva) => reserva.id === id) || null;
  }

  async actualizarEstado(id, idUsuario, rol, estado, estadosActuales) {
    const reserva = await this.findById(id);
    const columna = rol === 'FAMILIA' ? 'idPadre' : 'idNinera';
    if (
      !reserva
      || String(reserva[columna]) !== String(idUsuario)
      || !estadosActuales.includes(reserva.estado.toLowerCase())
    ) {
      return null;
    }
    reserva.estado = estado;
    return reserva;
  }
}

describe('ServicioReserva', () => {
  let repositorio;
  let servicio;

  beforeEach(() => {
    repositorio = new ReservaRepositoryEnMemoria();
    servicio = new ServicioReserva({ reservaRepository: repositorio });
  });

  test('lista únicamente las reservas relacionadas con la familia autenticada', async () => {
    const reservas = await servicio.listarReservas(10, 'FAMILIA');

    assert.deepEqual(reservas.map((reserva) => reserva.id), [1, 3]);
  });

  test('lista únicamente las reservas relacionadas con la niñera autenticada', async () => {
    const reservas = await servicio.listarReservas(20, 'NINERA');

    assert.deepEqual(reservas.map((reserva) => reserva.id), [1, 2]);
  });

  test('requiere sesión y rol de familia o niñera', async () => {
    await assert.rejects(servicio.listarReservas(null, 'FAMILIA'), UnauthorizedError);
    await assert.rejects(servicio.listarReservas(99, 'ADMIN'), ForbiddenError);
  });

  test('permite a la niñera aceptar una reserva pendiente', async () => {
    const actualizada = await servicio.actualizarEstado(20, 'NINERA', 1, 'aceptar');

    assert.equal(actualizada.estado, 'Aceptada');
  });

  test('permite a la niñera rechazar una reserva pendiente', async () => {
    const actualizada = await servicio.actualizarEstado(20, 'NINERA', 1, 'Rechazada');

    assert.equal(actualizada.estado, 'Rechazada');
  });

  test('permite a la familia cancelar una reserva aceptada', async () => {
    const actualizada = await servicio.actualizarEstado(11, 'FAMILIA', 2, 'cancelar');

    assert.equal(actualizada.estado, 'Cancelada');
  });

  test('acepta reservas confirmadas por flujos anteriores al cambiar el estado', async () => {
    repositorio.reservas[1].estado = 'Confirmada';

    const actualizada = await servicio.actualizarEstado(11, 'FAMILIA', 2, 'Cancelar');

    assert.equal(actualizada.estado, 'Cancelada');
  });

  test('no permite a una persona modificar una reserva ajena', async () => {
    await assert.rejects(
      servicio.actualizarEstado(99, 'FAMILIA', 1, 'Cancelada'),
      ForbiddenError,
    );
    assert.equal((await repositorio.findById(1)).estado, 'Pendiente');
  });

  test('no permite a la familia aceptar ni a la niñera decidir una reserva no pendiente', async () => {
    await assert.rejects(
      servicio.actualizarEstado(10, 'FAMILIA', 1, 'Aceptada'),
      ValidationError,
    );
    await assert.rejects(
      servicio.actualizarEstado(20, 'NINERA', 2, 'Rechazada'),
      ValidationError,
    );
  });

  test('rechaza estados e identificadores inválidos y reservas inexistentes', async () => {
    await assert.rejects(servicio.actualizarEstado(20, 'NINERA', 1, 'Completada'), ValidationError);
    await assert.rejects(servicio.actualizarEstado(20, 'NINERA', 'abc', 'Aceptada'), NotFoundError);
    await assert.rejects(servicio.actualizarEstado(20, 'NINERA', 999, 'Aceptada'), NotFoundError);
  });

  test('rechaza una actualización concurrente si el estado ya cambió', async () => {
    repositorio.actualizarEstado = async () => null;

    await assert.rejects(
      servicio.actualizarEstado(20, 'NINERA', 1, 'Aceptada'),
      (error) => error instanceof ValidationError && /cambió/.test(error.message),
    );
  });
});
