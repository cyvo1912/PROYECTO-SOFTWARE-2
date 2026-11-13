const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const PostgresReservaRepository = require('../src/infrastructure/adapters/db/PostgresReservaRepository');

describe('PostgresReservaRepository', () => {
  test('protege en una sola consulta el horario de la niñera y el del mismo hijo', async () => {
    let ejecutada;
    const repositorio = new PostgresReservaRepository({
      async query(sql, valores) {
        ejecutada = { sql, valores };
        return { rows: [] };
      },
    });

    await repositorio.crearSiNoHaySolapamiento({
      idPadre: 10, idNinera: 5, idHijo: 3, fechaReserva: '2026-11-16',
      horaInicio: '10:00', horaFin: '11:00', direccion: 'Av. Lima 123',
      comentario: null, tarifaHora: 20, horas: 1, montoTotal: 20,
      expiraEn: new Date('2026-11-10T15:10:00.000Z'),
    });

    assert.match(ejecutada.sql, /id_ninera = \$2/);
    assert.match(ejecutada.sql, /id_hijo = \$3::integer/);
    assert.deepEqual(ejecutada.valores.slice(0, 4), [10, 5, 3, '2026-11-16']);
  });
});
