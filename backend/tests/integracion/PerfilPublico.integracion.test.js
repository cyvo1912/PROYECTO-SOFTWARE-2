const PerfilPublicoController = require('../../src/infrastructure/http/controllers/PerfilPublicoController');
const ServicioPerfilPublico = require('../../src/application/services/ServicioPerfilPublico');

/**
 * PRUEBA DE INTEGRACIÓN (HU12) - estrategia Top-Down (Semana 11).
 *
 * Se integran los componentes reales de arriba hacia abajo:
 *   PerfilPublicoController (real) -> ServicioPerfilPublico (real) -> Repositorio (STUB)
 *
 * El repositorio de PostgreSQL se reemplaza por un Stub en memoria (componente de nivel
 * inferior). Se verifica el contrato entre capas: datos que viajan, códigos HTTP y
 * formato JSON de la respuesta.
 */

/** Stub del repositorio: devuelve respuestas predefinidas y guarda en memoria. */
class PerfilRepositoryStub {
  constructor() {
    this.nineras = {
      7: {
        id: 7, nombre: 'Ana', apellido: 'Pérez', fotoUrl: null, estadoCuenta: 'ACTIVA', verificada: true,
        biografia: '', aniosExperiencia: null, habilidades: [], idiomas: [], distritos: [], tarifaHora: 20, zona: null,
      },
      8: {
        id: 8, nombre: 'Rosa', apellido: 'Díaz', fotoUrl: null, estadoCuenta: 'PENDIENTE_VERIFICACION', verificada: false,
        biografia: '', aniosExperiencia: null, habilidades: [], idiomas: [], distritos: [], tarifaHora: 18, zona: null,
      },
    };
  }
  async buscarNinera(id) { return this.nineras[id] || null; }
  async actualizarPerfil(id, datos) { Object.assign(this.nineras[id], datos); }
  async listarCertificadosAprobados() { return []; }
  async obtenerReputacion() { return { total: 0, promedio: null }; }
}

/** Respuesta HTTP falsa de Express: guarda el status y el JSON enviado. */
function crearRes() {
  const res = {};
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (cuerpo) => { res.body = cuerpo; return res; };
  return res;
}

function crearSistema() {
  const repositorio = new PerfilRepositoryStub();
  const servicio = new ServicioPerfilPublico({ perfilRepository: repositorio });
  const controller = new PerfilPublicoController(servicio);
  return { controller, repositorio };
}

const NINERA_ANA = { id: 7, tipo_usuario: 'NINERA' };
const FAMILIA = { id: 3, tipo_usuario: 'FAMILIA' };

describe('Integración Controller -> Servicio -> Repositorio (HU12)', () => {
  test('I1: la niñera guarda su formulario y la familia ve esos datos en el perfil público', async () => {
    const { controller } = crearSistema();
    const formulario = {
      biografia: 'Educadora inicial, me encanta leer cuentos y hacer manualidades.',
      aniosExperiencia: 4,
      habilidades: ['Juegos educativos'],
      idiomas: ['Español', 'Inglés'],
      distritos: ['San Borja'],
    };

    const resGuardar = crearRes();
    await controller.actualizarMio({ user: NINERA_ANA, body: formulario }, resGuardar);

    const resVer = crearRes();
    await controller.ver({ user: FAMILIA, params: { idNinera: '7' } }, resVer);

    expect(resGuardar.statusCode).toBe(200);
    expect(resVer.statusCode).toBe(200);
    expect(resVer.body.data).toMatchObject({ nombre: 'Ana Pérez', ...formulario });
    expect(resVer.body.data.reputacion.texto).toBe('Sin valoraciones');
  });

  test('I2: formulario inválido -> HTTP 400 con los errores por campo para el formulario', async () => {
    const { controller, repositorio } = crearSistema();

    const res = crearRes();
    await controller.actualizarMio({ user: NINERA_ANA, body: { biografia: 'hola' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.fields).toHaveProperty('biografia');
    expect(repositorio.nineras[7].biografia).toBe('');
  });

  test('I3: niñera no verificada -> HTTP 404 "Perfil no disponible."', async () => {
    const { controller } = crearSistema();

    const res = crearRes();
    await controller.ver({ user: FAMILIA, params: { idNinera: '8' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Perfil no disponible.' });
  });

  test('I4: la niñera abre su formulario y recibe sus datos y las opciones de los chips', async () => {
    const { controller } = crearSistema();

    const res = crearRes();
    await controller.obtenerMio({ user: NINERA_ANA }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.opciones.idiomas).toContain('Quechua');
    expect(res.body.data.perfil.biografia).toBe('');
  });
});
