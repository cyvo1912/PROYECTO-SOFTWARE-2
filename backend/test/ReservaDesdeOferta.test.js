const { test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioReserva = require('../src/application/services/ServicioReserva');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');

function crearServicio() {
  let creada;
  const servicio = new ServicioReserva({
    reloj: () => new Date('2030-01-01T12:00:00Z'),
    ofertaTrabajoRepository: {
      findById: async () => ({ idPadre: 1, estado: 'ABIERTA', titulo: 'Cuidado', fechaInicio: '2030-01-02', horaInicio: '09:00', horaFin: '11:30', tarifaHora: 20 }),
      listarPostulantes: async () => [{ id: 4, idNinera: 2, estado: 'PENDIENTE' }],
    },
    reservaRepository: { crearDesdePostulacion: async (reserva) => { creada = reserva; return reserva; }, listarActivasDeHijoEnFecha: async () => [] },
    disponibilidadRepository: { obtenerResumenNinera: async () => ({ estadoCuenta: 'ACTIVA', tarifaHora: 70 }), listarDisponibilidadPorRango: async () => [new Disponibilidad({ id: 1, idNinera: 2, fecha: '2030-01-02', horaInicio: '08:00', horaFin: '13:00' })] },
    hijoRepository: { findById: async () => ({ perteneceA: (id) => id === 1 }) },
  });
  return { servicio, obtenerCreada: () => creada };
}

test('reserva desde postulación calcula la tarifa publicada, no la tarifa del perfil', async () => {
  const { servicio, obtenerCreada } = crearServicio();
  const reserva = await servicio.solicitarDesdePostulacion({ id: 1, tipo_usuario: 'FAMILIA' }, 3, 4, { direccion: 'Calle de prueba 123', idHijo: 9 });
  assert.equal(reserva.montoTotal, 50);
  assert.equal(reserva.tarifaHora, 20);
  assert.equal(reserva.horas, 2.5);
  assert.equal(obtenerCreada().idNinera, 2);
});

test('no permite seleccionar una postulación de una oferta ajena', async () => {
  const { servicio } = crearServicio();
  await assert.rejects(servicio.solicitarDesdePostulacion({ id: 9, tipo_usuario: 'FAMILIA' }, 3, 4, { direccion: 'Calle de prueba 123', idHijo: 9 }), /oferta no existe/i);
});
