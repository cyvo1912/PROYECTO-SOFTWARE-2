const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const PostgresReservaRepository = require('../src/infrastructure/adapters/db/PostgresReservaRepository');
const PostgresValoracionRepository = require('../src/infrastructure/adapters/db/PostgresValoracionRepository');
const PostgresPerfilPublicoRepository = require('../src/infrastructure/adapters/db/PostgresPerfilPublicoRepository');

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

  test('actualiza el estado sin ambigüedad de tipo para PostgreSQL', async () => {
    let ejecutada;
    const repositorio = new PostgresReservaRepository({
      async query(sql, valores) {
        ejecutada = { sql, valores };
        return { rows: [] };
      },
    });

    await repositorio.actualizarEstado(27, 'Pagada', ['Pendiente']);

    assert.match(ejecutada.sql, /estado_reserva = \$2::varchar/);
    assert.match(ejecutada.sql, /LOWER\(\$2::varchar\)/);
    assert.deepEqual(ejecutada.valores, [27, 'Pagada', ['pendiente']]);
  });
});

describe('PostgresValoracionRepository', () => {
  test('convierte un conflicto único de valoración en resultado nulo para el servicio', async () => {
    let ejecutada;
    const repositorio = new PostgresValoracionRepository({
      async query(sql, valores) {
        ejecutada = { sql, valores };
        return { rows: [] };
      },
    });

    const creada = await repositorio.crear({ idReserva: 10, idPadre: 2, idNinera: 3, calificacion: 5, comentario: null });

    assert.equal(creada, null);
    assert.match(ejecutada.sql, /ON CONFLICT \(id_reserva\) DO NOTHING/);
    assert.deepEqual(ejecutada.valores, [10, 2, 3, 5, null]);
  });
});

describe('PostgresPerfilPublicoRepository', () => {
  test('lista reseñas usando la fecha que conserva la migración vigente', async () => {
    let ejecutada;
    const repositorio = new PostgresPerfilPublicoRepository({
      async query(sql, valores) {
        ejecutada = { sql, valores };
        return { rows: [] };
      },
    });

    await repositorio.listarValoraciones(44);

    assert.match(ejecutada.sql, /TO_CHAR\(fecha_creacion, 'YYYY-MM-DD'\)/);
    assert.match(ejecutada.sql, /ORDER BY fecha_creacion DESC/);
    assert.deepEqual(ejecutada.valores, [44]);
  });
});
