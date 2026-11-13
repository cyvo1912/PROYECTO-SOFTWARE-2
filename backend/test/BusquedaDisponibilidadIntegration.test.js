const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');

const ServicioBusqueda = require('../src/application/services/ServicioBusqueda');
const ServicioDisponibilidad = require('../src/application/services/ServicioDisponibilidad');
const BusquedaController = require('../src/infrastructure/http/controllers/BusquedaController');
const DisponibilidadController = require('../src/infrastructure/http/controllers/DisponibilidadController');
const crearAuthMiddleware = require('../src/infrastructure/http/middlewares/authMiddleware');
const JwtTokenService = require('../src/infrastructure/adapters/security/JwtTokenService');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');

class RepositorioBusquedaMemoria {
  async buscarNinerasCercanas(filtros) {
    this.ultimosFiltros = filtros;
    return [{
      id_usuario: 7,
      nombre_usuario: 'Lucía',
      apellido_usuario: 'Valdez',
      correo: 'dato-privado@minana.com',
      celular: '999999999',
      foto_url: null,
      zona: 'Miraflores',
      experiencia: 'Cuidado infantil',
      anos_experiencia: 5,
      tarifa_hora: '30.00',
      descripcion: 'Niñera verificada.',
      verificada: true,
      calificacion_promedio: '4.8',
      latitud: '-12.121',
      longitud: '-77.030',
      distancia_km: '2.345',
    }];
  }
}

class RepositorioDisponibilidadMemoria {
  async listarNinerasActivas() {
    return [this.ninera];
  }

  async obtenerResumenNinera(idNinera) {
    return Number(idNinera) === 7 ? this.ninera : null;
  }

  async listarDisponibilidadPorRango() {
    return [new Disponibilidad({
      id: 1,
      idNinera: 7,
      fecha: '2026-11-16',
      horaInicio: '09:00:00',
      horaFin: '13:00:00',
    })];
  }

  async listarReservasActivasPorRango() {
    return [];
  }

  constructor() {
    this.ninera = {
      idNinera: 7,
      nombreCompleto: 'Lucía Valdez',
      tarifaHora: 30,
      zona: 'Miraflores',
      verificada: true,
    };
  }
}

describe('Integración HTTP: HU11 búsqueda y HU13 disponibilidad', () => {
  let server;
  let baseUrl;
  let tokenFamilia;
  let tokenNinera;

  before(async () => {
    const tokenService = new JwtTokenService('secreto_prueba_integracion_hu11_hu13');
    tokenFamilia = tokenService.generateToken({ id: 10, correo: 'familia@test.com', tipo_usuario: 'FAMILIA' });
    tokenNinera = tokenService.generateToken({ id: 7, correo: 'ninera@test.com', tipo_usuario: 'NINERA' });

    const app = express();
    const auth = crearAuthMiddleware(tokenService);
    const busqueda = new BusquedaController(new ServicioBusqueda({
      userRepository: new RepositorioBusquedaMemoria(),
    }));
    const disponibilidad = new DisponibilidadController(new ServicioDisponibilidad({
      disponibilidadRepository: new RepositorioDisponibilidadMemoria(),
    }));

    app.get('/api/busqueda/ninera', auth.autenticar, auth.soloFamilia, (req, res) => busqueda.buscarNineras(req, res));
    app.get('/api/nineras', auth.autenticar, auth.soloFamilia, (req, res) => disponibilidad.listarNineras(req, res));
    app.get('/api/nineras/:idNinera/disponibilidad', auth.autenticar, auth.soloFamilia, (req, res) => disponibilidad.consultarPorNinera(req, res));

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}/api`;
      resolve();
    }));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('protege búsqueda y calendario con 401 sin sesión y 403 para una niñera', async () => {
    const sinSesion = await fetch(`${baseUrl}/busqueda/ninera?latitud=-12.12&longitud=-77.03`);
    assert.equal(sinSesion.status, 401);

    const comoNinera = await fetch(`${baseUrl}/nineras`, {
      headers: { Authorization: `Bearer ${tokenNinera}` },
    });
    assert.equal(comoNinera.status, 403);
  });

  test('familia busca por ubicación y filtros sin recibir datos de contacto privados', async () => {
    const response = await fetch(`${baseUrl}/busqueda/ninera?latitud=-12.12&longitud=-77.03&radioKm=5&tarifaMaxima=35&experienciaMinima=3`, {
      headers: { Authorization: `Bearer ${tokenFamilia}` },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
    assert.equal(body.data.resultados[0].distanciaKm, 2.35);
    assert.equal(body.data.resultados[0].correo, undefined);
    assert.equal(body.data.resultados[0].celular, undefined);
  });

  test('familia consulta niñeras y franjas disponibles dentro de un rango', async () => {
    const headers = { Authorization: `Bearer ${tokenFamilia}` };
    const lista = await fetch(`${baseUrl}/nineras`, { headers });
    assert.equal(lista.status, 200);
    assert.deepEqual((await lista.json()).data, [{
      id: 7,
      nombreCompleto: 'Lucía Valdez',
      tarifaHora: 30,
      zona: 'Miraflores',
      verificada: true,
    }]);

    const calendario = await fetch(`${baseUrl}/nineras/7/disponibilidad?desde=2026-11-16&hasta=2026-11-16`, { headers });
    assert.equal(calendario.status, 200);
    const body = await calendario.json();
    assert.deepEqual(body.data.fechasDisponibles, ['2026-11-16']);
    assert.deepEqual(body.data.disponibilidadPorFecha['2026-11-16'], [{
      idDisponibilidad: 1,
      horaInicio: '09:00',
      horaFin: '13:00',
      estado: 'Disponible',
      disponible: true,
    }]);
  });
});
