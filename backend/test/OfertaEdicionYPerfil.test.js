const { test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioBolsaTrabajo = require('../src/application/services/ServicioBolsaTrabajo');
const ServicioPerfilPublico = require('../src/application/services/ServicioPerfilPublico');

const datos = { titulo: 'Cuidado infantil', descripcion: 'Cuidado por la tarde.', distrito: 'Lima', fechaInicio: '2030-02-01', horaInicio: '10:00', horaFin: '12:00', tarifaHora: 25, numeroNinos: 1 };

test('solo la familia propietaria puede editar una oferta', async () => {
  const servicio = new ServicioBolsaTrabajo({ obtenerFechaHoy: () => '2030-01-01', ofertaTrabajoRepository: {
    findById: async () => ({ idPadre: 1 }), editarOferta: async (_id, _familia, oferta) => oferta,
  } });
  assert.equal((await servicio.editarOferta({ id: 1, tipo_usuario: 'FAMILIA' }, 5, datos)).tarifaHora, 25);
  await assert.rejects(servicio.editarOferta({ id: 2, tipo_usuario: 'FAMILIA' }, 5, datos), /oferta de trabajo no existe/i);
});

test('la familia solo ve el perfil no verificado de su propia postulante activa', async () => {
  const servicio = new ServicioPerfilPublico({ perfilRepository: {
    buscarNinera: async () => ({ id: 7, nombre: 'Ana', apellido: 'P', verificada: false, estadoCuenta: 'ACTIVA' }),
    esPostulanteDeFamilia: async (_ninera, familia) => familia === 1,
    listarCertificadosAprobados: async () => [], obtenerReputacion: async () => ({ total: 0 }), listarValoraciones: async () => [],
  } });
  assert.equal((await servicio.verPerfilPublico({ id: 1, tipo_usuario: 'FAMILIA' }, 7)).verificada, false);
  await assert.rejects(servicio.verPerfilPublico({ id: 2, tipo_usuario: 'FAMILIA' }, 7), /Perfil no disponible/);
});
