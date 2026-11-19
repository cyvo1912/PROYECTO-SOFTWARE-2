const { test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioBusqueda = require('../src/application/services/ServicioBusqueda');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');
const { EstrategiaDisponibilidadRangoFechas } = require('../src/domain/strategies/EstrategiaCalculoDisponibilidad');

const familia = { id: 3, tipo_usuario: 'FAMILIA' };
function servicio() {
  const filas = [1, 2].map((id) => ({ id_usuario: id, nombre_usuario: `Niñera ${id}`, apellido_usuario: '', tarifa_hora: 20, verificada: true }));
  const bloques = [
    new Disponibilidad({ id: 1, idNinera: 1, fecha: '2030-01-03', horaInicio: '08:00', horaFin: '12:00' }),
    new Disponibilidad({ id: 2, idNinera: 1, fecha: '2030-01-04', horaInicio: '08:00', horaFin: '12:00' }),
    new Disponibilidad({ id: 3, idNinera: 2, fecha: '2030-01-03', horaInicio: '08:00', horaFin: '12:00' }),
  ];
  return new ServicioBusqueda({ reloj: () => new Date('2030-01-01T12:00:00Z'),
    userRepository: { listarNinerasDisponibles: async () => filas },
    disponibilidadRepository: { listarParaBusqueda: async () => ({ bloques, reservas: [{ idNinera: 1, fechaReserva: '2030-01-03', horaInicio: '10:00', horaFin: '11:00' }] }) },
    estrategiaDisponibilidad: new EstrategiaDisponibilidadRangoFechas(),
  });
}

test('encuentra tramos libres y descuenta una reserva parcial', async () => {
  const r = await servicio().buscarNineras(familia, { desde: '2030-01-03' });
  assert.deepEqual(r.resultados.find((n) => n.id === 1).disponibilidadCoincidente['2030-01-03'].map((s) => [s.horaInicio, s.horaFin]), [['08:00', '10:00'], ['11:00', '12:00']]);
});
test('un horario solo coincide cuando cabe íntegramente en el bloque libre', async () => {
  const r = await servicio().buscarNineras(familia, { desde: '2030-01-03', horaInicio: '09:00', horaFin: '11:00' });
  assert.deepEqual(r.resultados.map((n) => n.id), [2]);
});
test('distingue todos los días de al menos un día', async () => {
  const s = servicio();
  const filtros = { desde: '2030-01-03', hasta: '2030-01-04' };
  assert.deepEqual((await s.buscarNineras(familia, { ...filtros, modo: 'todos' })).resultados.map((n) => n.id), [1]);
  assert.deepEqual((await s.buscarNineras(familia, { ...filtros, modo: 'alguno' })).resultados.map((n) => n.id), [1, 2]);
});
test('rechaza fechas y horarios incompletos o rangos demasiado largos', async () => {
  const s = servicio();
  for (const filtros of [{ horaInicio: '08:00' }, { desde: '2030-01-03', horaInicio: '08:00' }, { desde: '2030-01-03', hasta: '2031-01-03' }]) {
    await assert.rejects(s.buscarNineras(familia, filtros));
  }
});
