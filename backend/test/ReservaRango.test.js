const { test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioReserva = require('../src/application/services/ServicioReserva');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');
const familia = { id: 1, tipo_usuario: 'FAMILIA' };
const solicitud = { idNinera: 2, fecha: '2030-01-03', fechaHasta: '2030-01-05', horaInicio: '08:00', horaFin: '10:30', direccion: 'Calle 123' };

function construir() {
  let guardadas = [];
  const reservaRepository = {
    crearRango: async (reservas, grupo) => { guardadas = reservas.map((r, i) => Object.assign(r, { id: i + 1, grupoReserva: grupo })); return guardadas; },
    listarGrupo: async () => guardadas,
    buscarPorId: async (id) => guardadas.find((r) => r.id === id),
    actualizarEstado: async (id, estado, _esperados, monto) => { assert.equal(monto, guardadas.filter((r) => r.estaPendiente()).reduce((s, r) => s + r.montoTotal, 0)); guardadas.filter((r) => r.estaPendiente()).forEach((r) => { r.estadoReserva = estado; }); return guardadas.find((r) => r.id === id); },
  };
  const servicio = new ServicioReserva({ reservaRepository, hijoRepository: {}, reloj: () => new Date('2030-01-01T12:00:00Z'),
    disponibilidadRepository: {
      obtenerResumenNinera: async () => ({ estadoCuenta: 'ACTIVA', tarifaHora: 20 }),
      listarDisponibilidadPorRango: async () => ['2030-01-03', '2030-01-04', '2030-01-05'].map((fecha, i) => new Disponibilidad({ id: i + 1, idNinera: 2, fecha, horaInicio: '08:00', horaFin: '12:00' })),
    },
  });
  return { servicio, reservas: () => guardadas };
}

test('cotiza y crea una reserva por fecha con un total único', async () => {
  const { servicio, reservas } = construir();
  assert.equal((await servicio.cotizar(familia, solicitud)).montoTotal, 150);
  const creada = await servicio.solicitarRango(familia, solicitud);
  assert.equal(creada.montoPago, 150);
  assert.equal(reservas().length, 3);
  assert.deepEqual(reservas().map((r) => r.fechaReserva), ['2030-01-03', '2030-01-04', '2030-01-05']);
  assert.equal(new Set(reservas().map((r) => r.grupoReserva)).size, 1);
});

test('el pago del grupo usa el total de sus fechas pendientes', async () => {
  const { servicio, reservas } = construir();
  await servicio.solicitarRango(familia, solicitud);
  const respuesta = await servicio.pagar(familia, 1, { metodoPago: 'TARJETA', datosPago: { ultimos4: '1234', titular: 'Prueba' } });
  assert.equal(respuesta.comprobante.monto, 150);
  assert.ok(reservas().every((r) => r.estadoReserva === 'Pagada'));
});

test('rechaza rangos inválidos o superiores a 31 días', async () => {
  const { servicio } = construir();
  await assert.rejects(servicio.solicitarRango(familia, { ...solicitud, fechaHasta: '2030-02-05' }));
  await assert.rejects(servicio.solicitarRango(familia, { ...solicitud, fechaHasta: '2030-01-02' }));
});

test('descuenta una fecha cancelada y rechaza un total desactualizado', async () => {
  const { servicio, reservas } = construir();
  await servicio.solicitarRango(familia, solicitud);
  reservas()[2].estadoReserva = 'Cancelada';
  const datosPago = { metodoPago: 'TARJETA', datosPago: { ultimos4: '1234', titular: 'Prueba' } };
  await assert.rejects(servicio.pagar(familia, 1, { ...datosPago, montoEsperado: 150 }), /total cambió/i);
  const pagada = await servicio.pagar(familia, 1, { ...datosPago, montoEsperado: 100 });
  assert.equal(pagada.comprobante.monto, 100);
  assert.equal(reservas()[2].estadoReserva, 'Cancelada');
});
