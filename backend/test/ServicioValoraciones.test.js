const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const ServicioValoraciones = require('../src/application/services/ServicioValoraciones');
const Reserva = require('../src/domain/entities/Reserva');
const { ValidationError, ForbiddenError, ConflictError } = require('../src/domain/errors/DomainErrors');

describe('ServicioValoraciones HU18', () => {
  let reservas;
  let valoraciones;
  let servicio;

  beforeEach(() => {
    reservas = new Map([[1, new Reserva({ id: 1, idPadre: 10, idNinera: 7, fechaReserva: '2026-11-01', horaInicio: '09:00', horaFin: '11:00', direccion: 'Av. Lima', estadoReserva: 'Completada' })]]);
    valoraciones = [];
    servicio = new ServicioValoraciones({
      reservaRepository: { async buscarPorId(id) { return reservas.get(Number(id)) || null; } },
      valoracionRepository: {
        async existeParaReserva(id) { return valoraciones.some((v) => v.idReserva === id); },
        async crear(datos) { const creada = { id: valoraciones.length + 1, ...datos }; valoraciones.push(creada); return creada; },
        async listarPorNinera(id) { return valoraciones.filter((v) => v.idNinera === id); },
      },
    });
  });

  test('registra una valoración de 1 a 5 solo para una reserva completada propia', async () => {
    const creada = await servicio.crear({ id: 10, tipo_usuario: 'FAMILIA' }, { idReserva: 1, calificacion: 5, comentario: 'Excelente cuidado.' });
    assert.deepEqual(creada, { id: 1, idReserva: 1, idPadre: 10, idNinera: 7, calificacion: 5, comentario: 'Excelente cuidado.' });
    assert.equal((await servicio.listarPorNinera(7)).length, 1);
  });

  test('rechaza valoración duplicada, ajena o antes de completar el servicio', async () => {
    await servicio.crear({ id: 10, tipo_usuario: 'FAMILIA' }, { idReserva: 1, calificacion: 4 });
    await assert.rejects(() => servicio.crear({ id: 10, tipo_usuario: 'FAMILIA' }, { idReserva: 1, calificacion: 4 }), ConflictError);
    await assert.rejects(() => servicio.crear({ id: 11, tipo_usuario: 'FAMILIA' }, { idReserva: 1, calificacion: 4 }), ForbiddenError);
    reservas.set(2, new Reserva({ id: 2, idPadre: 10, idNinera: 7, fechaReserva: '2026-11-20', horaInicio: '09:00', horaFin: '11:00', direccion: 'Av. Lima', estadoReserva: 'Aceptada' }));
    await assert.rejects(() => servicio.crear({ id: 10, tipo_usuario: 'FAMILIA' }, { idReserva: 2, calificacion: 5 }), ValidationError);
  });

  test('traduce a conflicto una inserción concurrente que la base de datos rechazó', async () => {
    servicio.valoracionRepository.crear = async () => null;
    await assert.rejects(
      () => servicio.crear({ id: 10, tipo_usuario: 'FAMILIA' }, { idReserva: 1, calificacion: 5 }),
      ConflictError,
    );
  });
});
