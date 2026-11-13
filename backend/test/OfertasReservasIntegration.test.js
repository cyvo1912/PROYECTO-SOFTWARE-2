const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const ServicioBolsaTrabajo = require('../src/application/services/ServicioBolsaTrabajo');
const ServicioReserva = require('../src/application/services/ServicioReserva');
const BolsaTrabajoController = require('../src/infrastructure/http/controllers/BolsaTrabajoController');
const ReservaController = require('../src/infrastructure/http/controllers/ReservaController');
const crearAuthMiddleware = require('../src/infrastructure/http/middlewares/authMiddleware');
const JwtTokenService = require('../src/infrastructure/adapters/security/JwtTokenService');
const OfertaTrabajo = require('../src/domain/entities/OfertaTrabajo');
const Postulacion = require('../src/domain/entities/Postulacion');
const Reserva = require('../src/domain/entities/Reserva');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');
const Hijo = require('../src/domain/entities/Hijo');

class OfertaRepositoryEnMemoria {
  constructor() {
    this.ofertas = [];
    this.postulaciones = [];
    this.siguienteOferta = 1;
  }

  async obtenerPerfilNinera() {
    return { zona: 'Miraflores', distritos: ['Miraflores'], tarifaHora: 20 };
  }

  async listarAbiertas({ desdeFecha }) {
    return this.ofertas.filter((oferta) => oferta.estado === 'ABIERTA' && oferta.fechaInicio >= desdeFecha);
  }

  async findById(id) { return this.ofertas.find((oferta) => oferta.id === id) || null; }
  async crearOferta(idPadre, datos) {
    const oferta = new OfertaTrabajo({ id: this.siguienteOferta++, idPadre, ...datos });
    this.ofertas.push(oferta);
    return oferta;
  }
  async listarPorPadre(idPadre) { return this.ofertas.filter((oferta) => oferta.idPadre === idPadre); }
  async listarIdsOfertasPostuladas(idNinera) {
    return this.postulaciones.filter((postulacion) => postulacion.idNinera === idNinera).map((postulacion) => postulacion.idOferta);
  }
  async crearPostulacion(idOferta, idNinera, mensaje) {
    const postulacion = new Postulacion({ id: this.postulaciones.length + 1, idOferta, idNinera, mensaje });
    this.postulaciones.push(postulacion);
    return postulacion;
  }
  async listarPostulacionesPorNinera(idNinera) {
    return this.postulaciones.filter((postulacion) => postulacion.idNinera === idNinera);
  }
}

class ReservaRepositoryEnMemoria {
  constructor(reloj) { this.reloj = reloj; this.reservas = []; }
  async listarActivasDeNineraEnFecha(idNinera, fecha) {
    return this.reservas.filter((reserva) => reserva.idNinera === idNinera && reserva.fechaReserva === fecha && reserva.estaActiva(this.reloj()));
  }
  async listarActivasDeHijoEnFecha(idHijo, fecha) {
    return this.reservas.filter((reserva) => reserva.idHijo === idHijo && reserva.fechaReserva === fecha && reserva.estaActiva(this.reloj()));
  }
  async crearSiNoHaySolapamiento(reserva) {
    const guardada = new Reserva({ ...reserva, id: this.reservas.length + 1 });
    this.reservas.push(guardada);
    return guardada;
  }
  async listarPorPadre(idPadre) { return this.reservas.filter((reserva) => reserva.idPadre === idPadre); }
}

describe('Integración HTTP: HU14 bolsa de trabajo y HU reservas', () => {
  let server;
  let baseUrl;
  let tokenFamilia;
  let tokenNinera;

  before(async () => {
    const reloj = () => new Date('2026-11-10T15:00:00.000Z');
    const tokenService = new JwtTokenService('secreto_integracion_ofertas_reservas');
    tokenFamilia = tokenService.generateToken({ id: 10, tipo_usuario: 'FAMILIA' });
    tokenNinera = tokenService.generateToken({ id: 7, tipo_usuario: 'NINERA' });
    const auth = crearAuthMiddleware(tokenService);

    const ofertas = new ServicioBolsaTrabajo({
      ofertaTrabajoRepository: new OfertaRepositoryEnMemoria(),
      obtenerFechaHoy: () => '2026-11-10',
    });
    const disponibilidad = {
      async obtenerResumenNinera() { return { idNinera: 7, estadoCuenta: 'ACTIVA', tarifaHora: 20 }; },
      async listarDisponibilidadPorRango() {
        return [new Disponibilidad({ id: 1, idNinera: 7, diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '18:00' })];
      },
    };
    const reservas = new ServicioReserva({
      reservaRepository: new ReservaRepositoryEnMemoria(reloj),
      disponibilidadRepository: disponibilidad,
      hijoRepository: { async findById(id) { return id === 1 ? new Hijo({ id: 1, idPadre: 10, nombre: 'Ana', edad: 5 }) : null; } },
      reloj,
    });
    const bolsaController = new BolsaTrabajoController(ofertas);
    const reservaController = new ReservaController(reservas);
    const app = express();
    app.use(express.json());
    app.post('/api/ofertas', auth.autenticar, auth.soloFamilia, (req, res) => bolsaController.publicar(req, res));
    app.get('/api/ofertas', auth.autenticar, auth.soloNinera, (req, res) => bolsaController.explorar(req, res));
    app.post('/api/ofertas/:id/postulaciones', auth.autenticar, auth.soloNinera, (req, res) => bolsaController.postular(req, res));
    app.post('/api/reservas/cotizar', auth.autenticar, auth.soloFamilia, (req, res) => reservaController.cotizar(req, res));
    app.post('/api/reservas', auth.autenticar, auth.soloFamilia, (req, res) => reservaController.solicitar(req, res));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(async () => new Promise((resolve) => server.close(resolve)));

  test('protege los endpoints nuevos y aplica los roles correctos', async () => {
    assert.equal((await fetch(`${baseUrl}/ofertas`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/reservas`, { method: 'POST', headers: { Authorization: `Bearer ${tokenNinera}` } })).status, 403);
  });

  test('familia publica, niñera explora y se postula a una oferta', async () => {
    const oferta = await fetch(`${baseUrl}/ofertas`, {
      method: 'POST', headers: { Authorization: `Bearer ${tokenFamilia}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Cuidado de tarde', descripcion: 'Cuidar a dos niños después del colegio.', distrito: 'Miraflores', fechaInicio: '2026-11-20', horaInicio: '14:00', horaFin: '18:00', tarifaHora: 25, numeroNinos: 2 }),
    });
    assert.equal(oferta.status, 201);
    const creada = await oferta.json();
    const exploracion = await fetch(`${baseUrl}/ofertas`, { headers: { Authorization: `Bearer ${tokenNinera}` } });
    assert.equal(exploracion.status, 200);
    assert.equal((await exploracion.json()).data.ofertas[0].compatibilidad.esAcorde, true);
    const postulacion = await fetch(`${baseUrl}/ofertas/${creada.data.id}/postulaciones`, { method: 'POST', headers: { Authorization: `Bearer ${tokenNinera}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: 'Tengo experiencia comprobable.' }) });
    assert.equal(postulacion.status, 201);
  });

  test('familia cotiza y separa una reserva disponible por diez minutos', async () => {
    const solicitud = { idNinera: 7, idHijo: 1, fecha: '2026-11-16', horaInicio: '09:00', horaFin: '11:30', direccion: 'Av. Larco 123' };
    const headers = { Authorization: `Bearer ${tokenFamilia}`, 'Content-Type': 'application/json' };
    const cotizacion = await fetch(`${baseUrl}/reservas/cotizar`, { method: 'POST', headers, body: JSON.stringify(solicitud) });
    assert.deepEqual((await cotizacion.json()).data, { tarifaHora: 20, horas: 2.5, montoTotal: 50 });
    const reserva = await fetch(`${baseUrl}/reservas`, { method: 'POST', headers, body: JSON.stringify(solicitud) });
    assert.equal(reserva.status, 201);
    const cuerpo = await reserva.json();
    assert.equal(cuerpo.data.estadoReserva, 'Pendiente');
    assert.equal(cuerpo.data.segundosParaPagar, 600);
  });
});
