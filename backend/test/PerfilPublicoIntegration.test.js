const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');

const PerfilPublicoRepositoryPort = require('../src/application/ports/PerfilPublicoRepositoryPort');
const ServicioPerfilPublico = require('../src/application/services/ServicioPerfilPublico');
const PerfilPublicoController = require('../src/infrastructure/http/controllers/PerfilPublicoController');
const crearAuthMiddleware = require('../src/infrastructure/http/middlewares/authMiddleware');
const JwtTokenService = require('../src/infrastructure/adapters/security/JwtTokenService');
const Ninera = require('../src/domain/entities/Ninera');

/**
 * Repositorio Stub en Memoria que implementa PerfilPublicoRepositoryPort
 * para pruebas de integración de Arquitectura Hexagonal.
 */
class PerfilRepositoryMemoryStub extends PerfilPublicoRepositoryPort {
  constructor() {
    super();
    this.nineras = {
      7: new Ninera(
        { id: 7, nombre: 'Ana', apellido: 'Pérez', fotoUrl: 'https://cdn.example.com/ana.jpg', estadoCuenta: 'ACTIVA', tipoUsuario: 'NINERA' },
        { idNinera: 7, descripcion: 'Educadora con amplia experiencia', anosExperiencia: 4, tarifaHora: 25, verificada: true }
      ),
      8: new Ninera(
        { id: 8, nombre: 'Rosa', apellido: 'Díaz', fotoUrl: null, estadoCuenta: 'PENDIENTE_VERIFICACION', tipoUsuario: 'NINERA' },
        { idNinera: 8, descripcion: 'En proceso de verificación', anosExperiencia: 2, tarifaHora: 18, verificada: false }
      ),
    };

    this.certificados = {
      7: [
        { tipo: 'PRIMEROS_AUXILIOS', nombre: 'RCP y Primeros Auxilios', institucion: 'Cruz Roja', fechaEmision: '2026-03-15' },
      ],
      8: [],
    };

    this.reputaciones = {
      7: { total: 3, promedio: 4.8 },
      8: { total: 0, promedio: null },
    };
  }

  async buscarNinera(id) {
    const ninera = this.nineras[id];
    if (!ninera) return null;
    return {
      id: ninera.idNinera || ninera.id,
      nombre: ninera.nombre,
      apellido: ninera.apellido,
      fotoUrl: ninera.fotoUrl,
      estadoCuenta: ninera.estadoCuenta,
      biografia: ninera.biografia || ninera.descripcion || '',
      aniosExperiencia: ninera.aniosExperiencia,
      habilidades: ninera.habilidades || [],
      idiomas: ninera.idiomas || [],
      distritos: ninera.distritos || [],
      tarifaHora: ninera.tarifaHora,
      zona: ninera.zona,
      verificada: ninera.verificada === true,
      dni: '12345678', // Dato privado que NO debe exponerse
      correo: 'privado@ejemplo.com', // Dato privado que NO debe exponerse
      celular: '999888777', // Dato privado que NO debe exponerse
    };
  }

  async actualizarPerfil(id, datos) {
    if (this.nineras[id]) {
      this.nineras[id].descripcion = datos.biografia;
      this.nineras[id].biografia = datos.biografia;
      this.nineras[id].anosExperiencia = datos.aniosExperiencia;
      this.nineras[id].aniosExperiencia = datos.aniosExperiencia;
      this.nineras[id].habilidades = datos.habilidades;
      this.nineras[id].idiomas = datos.idiomas;
      this.nineras[id].distritos = datos.distritos;
    }
  }

  async listarCertificadosAprobados(id) {
    return this.certificados[id] || [];
  }

  async obtenerReputacion(id) {
    return this.reputaciones[id] || { total: 0, promedio: null };
  }

  async listarValoraciones(id) {
    if (Number(id) !== 7) return [];
    return [{ calificacion: 5, comentario: 'Muy responsable y puntual.', fechaValoracion: '2026-11-01' }];
  }
}

describe('Integración HTTP End-to-End: HU12 Perfil Público (Arquitectura Hexagonal)', () => {
  let server;
  let baseUrl;
  let tokenService;
  let tokenFamilia;
  let tokenNineraAna;
  let tokenNineraRosa;

  before(async () => {
    tokenService = new JwtTokenService('secreto_prueba_integracion_hu12');
    tokenFamilia = tokenService.generateToken({ id: 100, correo: 'familia@test.com', tipo_usuario: 'FAMILIA' });
    tokenNineraAna = tokenService.generateToken({ id: 7, correo: 'ana@test.com', tipo_usuario: 'NINERA' });
    tokenNineraRosa = tokenService.generateToken({ id: 8, correo: 'rosa@test.com', tipo_usuario: 'NINERA' });

    // Armado de la aplicación Express conectando adaptadores
    const app = express();
    app.use(express.json());

    const repo = new PerfilRepositoryMemoryStub();
    const servicio = new ServicioPerfilPublico({ perfilRepository: repo });
    const controller = new PerfilPublicoController(servicio);
    const authMiddleware = crearAuthMiddleware(tokenService);

    const router = express.Router();
    router.get('/mio', authMiddleware.autenticar, authMiddleware.soloNinera, (req, res) => controller.obtenerMio(req, res));
    router.put('/mio', authMiddleware.autenticar, authMiddleware.soloNinera, (req, res) => controller.actualizarMio(req, res));
    router.get('/:idNinera', authMiddleware.autenticar, (req, res) => controller.ver(req, res));

    app.use('/api/perfil-publico', router);

    // Servidor en puerto efímero
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/perfil-publico`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  /* -------------------------------------------------------------
   * 1. Autenticación y Autorización (Security Middleware)
   * ------------------------------------------------------------- */
  test('Seguridad: rechaza peticiones a /mio sin token con HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/mio`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('Seguridad: rechaza token inválido con HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/mio`, {
      headers: { Authorization: 'Bearer token_totalmente_invalido' },
    });
    assert.equal(res.status, 401);
  });

  test('Seguridad: prohíbe acceso a /mio a usuarios FAMILIA con HTTP 403 (solo niñera)', async () => {
    const res = await fetch(`${baseUrl}/mio`, {
      headers: { Authorization: `Bearer ${tokenFamilia}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /solo niñeras autorizadas/i);
  });

  test('Seguridad: prohíbe actualizar /mio a usuarios FAMILIA con HTTP 403', async () => {
    const res = await fetch(`${baseUrl}/mio`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenFamilia}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ biografia: 'Intento no autorizado' }),
    });
    assert.equal(res.status, 403);
  });

  /* -------------------------------------------------------------
   * 2. Consulta de Formulario Propio (GET /mio)
   * ------------------------------------------------------------- */
  test('Formulario: niñera consulta /mio y obtiene su perfil precargado y catálogo de opciones', async () => {
    const res = await fetch(`${baseUrl}/mio`, {
      headers: { Authorization: `Bearer ${tokenNineraAna}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.data.opciones);
    assert.ok(Array.isArray(body.data.opciones.habilidades));
    assert.ok(Array.isArray(body.data.opciones.idiomas));
    assert.ok(Array.isArray(body.data.opciones.distritos));
    assert.ok(body.data.opciones.habilidades.includes('Primeros auxilios'));
    assert.ok(body.data.opciones.idiomas.includes('Español'));
  });

  /* -------------------------------------------------------------
   * 3. Validaciones de Dominio (PUT /mio) - HTTP 400
   * ------------------------------------------------------------- */
  test('Validación: rechaza biografía menor a 30 caracteres con HTTP 400 y mensaje en fields', async () => {
    const payloadInvalido = {
      biografia: 'muy corta',
      aniosExperiencia: 3,
      habilidades: ['Cuidado de bebés'],
      idiomas: ['Español'],
      distritos: ['Miraflores'],
    };

    const res = await fetch(`${baseUrl}/mio`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenNineraAna}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadInvalido),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.fields.biografia);
  });

  test('Validación: rechaza años de experiencia fuera de rango con HTTP 400', async () => {
    const payloadInvalido = {
      biografia: 'Soy una niñera profesional con pasión por la enseñanza.',
      aniosExperiencia: 75, // máximo es 60
      habilidades: ['Cuidado de bebés'],
      idiomas: ['Español'],
      distritos: ['Miraflores'],
    };

    const res = await fetch(`${baseUrl}/mio`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenNineraAna}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadInvalido),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.fields.aniosExperiencia);
  });

  test('Validación: rechaza habilidades fuera del catálogo con HTTP 400', async () => {
    const payloadInvalido = {
      biografia: 'Soy una niñera profesional con pasión por la enseñanza.',
      aniosExperiencia: 4,
      habilidades: ['Habilidad Inexistente XYZ'],
      idiomas: ['Español'],
      distritos: ['Miraflores'],
    };

    const res = await fetch(`${baseUrl}/mio`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenNineraAna}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadInvalido),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.fields.habilidades);
  });

  /* -------------------------------------------------------------
   * 4. Actualización Exitosa (PUT /mio) - HTTP 200
   * ------------------------------------------------------------- */
  test('Actualización: niñera guarda formulario válido con HTTP 200 y sanitización de espacios', async () => {
    const payloadValido = {
      biografia: '   Soy educadora de párvulos con amplia paciencia y vocación.   ',
      aniosExperiencia: 5,
      habilidades: ['Cuidado de bebés', 'Estimulación temprana'],
      idiomas: ['Español', 'Inglés'],
      distritos: ['Miraflores', 'San Isidro'],
    };

    const res = await fetch(`${baseUrl}/mio`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenNineraAna}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadValido),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message, 'Perfil público actualizado.');
    assert.equal(body.data.biografia, 'Soy educadora de párvulos con amplia paciencia y vocación.');
    assert.equal(body.data.aniosExperiencia, 5);
  });

  /* -------------------------------------------------------------
   * 5. Visualización del Perfil Público (GET /:idNinera)
   * ------------------------------------------------------------- */
  test('Visualización: familia consulta niñera verificada y recibe perfil con certificados y reputación', async () => {
    const res = await fetch(`${baseUrl}/7`, {
      headers: { Authorization: `Bearer ${tokenFamilia}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.success, true);
    const perfil = body.data;
    assert.equal(perfil.id, 7);
    assert.equal(perfil.nombre, 'Ana Pérez');
    assert.equal(perfil.verificada, true);
    assert.equal(perfil.aniosExperiencia, 5);
    assert.equal(perfil.reputacion.promedio, 4.8);
    assert.equal(perfil.reputacion.total, 3);
    assert.deepEqual(perfil.valoraciones, [{ calificacion: 5, comentario: 'Muy responsable y puntual.', fechaValoracion: '2026-11-01' }]);
    assert.equal(perfil.certificados.length, 1);
    assert.equal(perfil.certificados[0].nombre, 'RCP y Primeros Auxilios');

    // Regla de privacidad: jamás exponer datos privados
    assert.equal(perfil.dni, undefined);
    assert.equal(perfil.correo, undefined);
    assert.equal(perfil.celular, undefined);
    assert.equal(perfil.contrasenaHash, undefined);
  });

  test('Visualización: familia consulta niñera no verificada -> HTTP 404 "Perfil no disponible."', async () => {
    const res = await fetch(`${baseUrl}/8`, {
      headers: { Authorization: `Bearer ${tokenFamilia}` },
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.message, 'Perfil no disponible.');
  });

  test('Visualización: la propia niñera no verificada sí puede ver su perfil como vista previa', async () => {
    const res = await fetch(`${baseUrl}/8`, {
      headers: { Authorization: `Bearer ${tokenNineraRosa}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, 8);
    assert.equal(body.data.verificada, false);
  });

  test('Visualización: id inexistente o inválido -> HTTP 404', async () => {
    const resInexistente = await fetch(`${baseUrl}/999999`, {
      headers: { Authorization: `Bearer ${tokenFamilia}` },
    });
    assert.equal(resInexistente.status, 404);

    const resInvalido = await fetch(`${baseUrl}/abc`, {
      headers: { Authorization: `Bearer ${tokenFamilia}` },
    });
    assert.equal(resInvalido.status, 404);
  });
});
