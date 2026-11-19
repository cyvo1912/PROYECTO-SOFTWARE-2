const { test } = require('node:test');
const assert = require('node:assert/strict');
const Repo = require('../src/infrastructure/adapters/db/PostgresReservaRepository');

test('distribuye el 5% del pago agrupado sin perder céntimos', async () => {
  const filas = [1, 2, 3].map(id => ({ id_reserva: id, monto_total: '0.10', fecha_reserva: '2026-11-20', hora_inicio: '10:00', hora_fin: '11:00', expira_en: null }));
  const comisiones = [];
  const client = { release() {}, async query(sql, params) {
    if (sql.startsWith('SELECT grupo_reserva')) return { rows: [{ grupo_reserva: '00000000-0000-0000-0000-000000000001' }] };
    if (sql.includes('FOR UPDATE')) return { rows: filas };
    if (sql.startsWith("UPDATE reserva SET estado_reserva='Pagada'")) return { rows: filas };
    if (sql.startsWith('UPDATE reserva SET fecha_pago')) { comisiones.push(params[1]); return { rows: [] }; }
    return { rows: [] };
  }};
  const repo = new Repo({ connect: async () => client });
  const reserva = await repo.confirmarPago(1, ['pendiente'], 0.30);
  assert.equal(reserva.id, 1);
  assert.deepEqual(comisiones, [0.01, 0, 0.01]);
  assert.equal(Math.round(comisiones.reduce((a,b) => a+b,0)*100), 2);
});
