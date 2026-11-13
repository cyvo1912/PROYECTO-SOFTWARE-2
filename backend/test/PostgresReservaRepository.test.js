const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const PostgresReservaRepository = require('../src/infrastructure/adapters/db/PostgresReservaRepository');

const FILA_RESERVA = {
  id_reserva: 7,
  id_padre: 10,
  id_ninera: 20,
  id_hijo: 31,
  fecha_reserva: '2026-11-12',
  hora_inicio: '09:30:00',
  hora_fin: '12:00:00',
  direccion: 'Av. Lima 123',
  estado_reserva: 'Pendiente',
  comentario: 'Llamar al llegar',
  nombre_familia: 'Familia Salazar',
  nombre_padre: 'Rodrigo',
  apellido_padre: 'Salazar',
  nombre_ninera: 'Ana',
  apellido_ninera: 'Pérez',
  nombre_hijo: 'Lucía',
};

describe('PostgresReservaRepository', () => {
  test('filtra por el id del usuario y adapta la reserva al formato de la aplicación', async () => {
    let queryEjecutada;
    const repository = new PostgresReservaRepository({
      async query(sql, params) {
        queryEjecutada = { sql, params };
        return { rows: [FILA_RESERVA] };
      },
    });

    const [reserva] = await repository.listarPorUsuario(10, 'FAMILIA');

    assert.match(queryEjecutada.sql, /WHERE r\.id_padre = \$1/);
    assert.deepEqual(queryEjecutada.params, [10]);
    assert.deepEqual(reserva, {
      id: 7,
      idPadre: 10,
      idNinera: 20,
      idHijo: 31,
      fecha: '2026-11-12',
      horaInicio: '09:30:00',
      horaFin: '12:00:00',
      direccion: 'Av. Lima 123',
      estado: 'Pendiente',
      comentario: 'Llamar al llegar',
      nombreFamilia: 'Familia Salazar',
      nombrePadre: 'Rodrigo Salazar',
      nombreNinera: 'Ana Pérez',
      nombreHijo: 'Lucía',
    });
  });

  test('filtra el historial de niñera usando su relación, no un id enviado por el cliente', async () => {
    let queryEjecutada;
    const repository = new PostgresReservaRepository({
      async query(sql, params) {
        queryEjecutada = { sql, params };
        return { rows: [] };
      },
    });

    await repository.listarPorUsuario(20, 'NINERA');

    assert.match(queryEjecutada.sql, /WHERE r\.id_ninera = \$1/);
    assert.deepEqual(queryEjecutada.params, [20]);
  });

  test('actualiza el estado de forma condicional y restringida al usuario y estado actual', async () => {
    const queries = [];
    const repository = new PostgresReservaRepository({
      async query(sql, params) {
        queries.push({ sql, params });
        return queries.length === 1 ? { rows: [{ id_reserva: 7 }] } : { rows: [FILA_RESERVA] };
      },
    });

    const actualizada = await repository.actualizarEstado(
      7,
      20,
      'NINERA',
      'Aceptada',
      ['pendiente'],
    );

    assert.match(queries[0].sql, /AND id_ninera = \$3/);
    assert.match(queries[0].sql, /LOWER\(estado_reserva\) = ANY\(\$4::text\[\]\)/);
    assert.deepEqual(queries[0].params, [7, 'Aceptada', 20, ['pendiente']]);
    assert.equal(actualizada.id, 7);
    assert.equal(queries.length, 2);
  });

  test('devuelve null cuando no existe la reserva solicitada', async () => {
    const repository = new PostgresReservaRepository({
      async query() {
        return { rows: [] };
      },
    });

    assert.equal(await repository.findById(999), null);
  });
});
