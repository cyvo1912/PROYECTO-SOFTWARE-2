const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioBolsaTrabajo = require('../src/application/services/ServicioBolsaTrabajo');
const OfertaTrabajo = require('../src/domain/entities/OfertaTrabajo');
const Postulacion = require('../src/domain/entities/Postulacion');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../src/domain/errors/DomainErrors');

const HOY = '2026-11-10';
const ID_NINERA = 7;
const ID_FAMILIA = 3;

/** Repositorio en memoria que reemplaza a PostgresOfertaTrabajoRepository en las pruebas. */
class OfertaTrabajoRepositoryEnMemoria {
  constructor() {
    this.ofertas = [];
    this.postulaciones = [];
    this.perfiles = new Map();
    this.siguienteOferta = 1;
    this.siguientePostulacion = 1;
  }

  async obtenerPerfilNinera(idNinera) {
    return this.perfiles.get(idNinera) || null;
  }

  async listarAbiertas({ q, distrito, tarifaMin, desdeFecha } = {}) {
    return this.ofertas
      .filter((o) => o.estado === 'ABIERTA')
      .filter((o) => !desdeFecha || o.fechaInicio >= desdeFecha)
      .filter((o) => !distrito || o.distrito.toLowerCase().includes(distrito.toLowerCase()))
      .filter((o) => tarifaMin === null || tarifaMin === undefined || o.tarifaHora >= tarifaMin)
      .filter((o) => !q || `${o.titulo} ${o.descripcion}`.toLowerCase().includes(q.toLowerCase()))
      .slice()
      .reverse();
  }

  async findById(idOferta) {
    return this.ofertas.find((o) => o.id === idOferta) || null;
  }

  async crearOferta(idPadre, datos) {
    const oferta = new OfertaTrabajo({ id: this.siguienteOferta++, idPadre, nombreFamilia: 'Familia Prueba', ...datos });
    this.ofertas.push(oferta);
    return oferta;
  }

  async listarPorPadre(idPadre) {
    return this.ofertas.filter((o) => o.idPadre === idPadre);
  }

  async listarIdsOfertasPostuladas(idNinera) {
    return this.postulaciones.filter((p) => p.idNinera === idNinera).map((p) => p.idOferta);
  }

  async crearPostulacion(idOferta, idNinera, mensaje) {
    const postulacion = new Postulacion({ id: this.siguientePostulacion++, idOferta, idNinera, mensaje });
    this.postulaciones.push(postulacion);
    return postulacion;
  }

  async listarPostulacionesPorNinera(idNinera) {
    return this.postulaciones.filter((p) => p.idNinera === idNinera);
  }
}

function datosOferta(extra = {}) {
  return {
    titulo: 'Cuidado de tarde',
    descripcion: 'Cuidar a dos niños después del colegio.',
    distrito: 'Miraflores',
    fechaInicio: '2026-11-20',
    horaInicio: '14:00',
    horaFin: '18:00',
    tarifaHora: 20,
    numeroNinos: 2,
    edadesNinos: '4 y 7 años',
    requisitos: '',
    ...extra,
  };
}

describe('ServicioBolsaTrabajo', () => {
  let repositorio;
  let servicio;
  const ninera = { id: ID_NINERA, tipo_usuario: 'NINERA' };
  const familia = { id: ID_FAMILIA, tipo_usuario: 'FAMILIA' };

  beforeEach(() => {
    repositorio = new OfertaTrabajoRepositoryEnMemoria();
    repositorio.perfiles.set(ID_NINERA, {
      idNinera: ID_NINERA,
      zona: 'Surco',
      distritos: ['Miraflores', 'San Isidro'],
      tarifaHora: 18,
    });
    servicio = new ServicioBolsaTrabajo({
      ofertaTrabajoRepository: repositorio,
      obtenerFechaHoy: () => HOY,
    });
  });

  test('la familia publica una oferta válida', async () => {
    const oferta = await servicio.publicarOferta(familia, datosOferta({ titulo: '  Cuidado de tarde  ' }));
    assert.equal(oferta.idPadre, ID_FAMILIA);
    assert.equal(oferta.titulo, 'Cuidado de tarde');
    assert.equal(oferta.tarifaHora, 20);
    assert.equal(oferta.requisitos, null);
  });

  test('rechaza una oferta inválida indicando cada campo', async () => {
    await assert.rejects(
      () =>
        servicio.publicarOferta(
          familia,
          datosOferta({ titulo: '', fechaInicio: '2026-11-01', horaFin: '13:00', tarifaHora: 0, numeroNinos: 0 }),
        ),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.ok(error.fields.titulo);
        assert.ok(error.fields.fechaInicio);
        assert.ok(error.fields.horaFin);
        assert.ok(error.fields.tarifaHora);
        assert.ok(error.fields.numeroNinos);
        return true;
      },
    );
  });

  test('la niñera explora las ofertas abiertas con su compatibilidad, acordes primero', async () => {
    await servicio.publicarOferta(familia, datosOferta({ titulo: 'Oferta acorde', distrito: 'miraflores' }));
    await servicio.publicarOferta(familia, datosOferta({ titulo: 'Oferta lejana', distrito: 'Callao' }));

    const resultado = await servicio.explorarOfertas(ninera);
    assert.equal(resultado.total, 2);
    assert.equal(resultado.ofertas[0].titulo, 'Oferta acorde');
    assert.equal(resultado.ofertas[0].compatibilidad.esAcorde, true);
    assert.equal(resultado.ofertas[1].compatibilidad.zonaCoincide, false);
    assert.deepEqual(resultado.perfil.distritos, ['Miraflores', 'San Isidro']);
  });

  test('marca como no acorde una oferta que paga menos que la tarifa de la niñera', async () => {
    await servicio.publicarOferta(familia, datosOferta({ tarifaHora: 12 }));
    const { ofertas } = await servicio.explorarOfertas(ninera);
    assert.equal(ofertas[0].compatibilidad.zonaCoincide, true);
    assert.equal(ofertas[0].compatibilidad.tarifaAdecuada, false);
    assert.equal(ofertas[0].compatibilidad.esAcorde, false);
  });

  test('filtra solo las ofertas acordes al perfil y por texto', async () => {
    await servicio.publicarOferta(familia, datosOferta({ titulo: 'Fin de semana', distrito: 'San Isidro' }));
    await servicio.publicarOferta(familia, datosOferta({ titulo: 'Noche', distrito: 'Callao' }));

    const acordes = await servicio.explorarOfertas(ninera, { soloCompatibles: 'true' });
    assert.deepEqual(acordes.ofertas.map((o) => o.titulo), ['Fin de semana']);

    const porTexto = await servicio.explorarOfertas(ninera, { q: 'noche' });
    assert.deepEqual(porTexto.ofertas.map((o) => o.titulo), ['Noche']);
  });

  test('no muestra ofertas cerradas ni con fecha pasada', async () => {
    const cerrada = await servicio.publicarOferta(familia, datosOferta());
    cerrada.estado = 'CERRADA';
    repositorio.ofertas.push(new OfertaTrabajo({ id: 99, idPadre: ID_FAMILIA, ...datosOferta({ fechaInicio: '2026-11-01' }) }));

    const { total } = await servicio.explorarOfertas(ninera);
    assert.equal(total, 0);
  });

  test('rechaza filtros inválidos', async () => {
    await assert.rejects(() => servicio.explorarOfertas(ninera, { tarifaMin: 'abc' }), ValidationError);
  });

  test('la niñera se postula una sola vez a una oferta', async () => {
    const oferta = await servicio.publicarOferta(familia, datosOferta());

    const postulacion = await servicio.postular(ninera, String(oferta.id), { mensaje: '  Tengo 3 años de experiencia ' });
    assert.equal(postulacion.idOferta, oferta.id);
    assert.equal(postulacion.mensaje, 'Tengo 3 años de experiencia');

    const detalle = await servicio.obtenerOferta(ninera, oferta.id);
    assert.equal(detalle.yaPostulada, true);

    await assert.rejects(() => servicio.postular(ninera, oferta.id), ConflictError);
  });

  test('no permite postular a una oferta cerrada', async () => {
    const oferta = await servicio.publicarOferta(familia, datosOferta());
    oferta.estado = 'CERRADA';
    await assert.rejects(() => servicio.postular(ninera, oferta.id), ConflictError);
  });

  test('responde 404 si la oferta no existe o el id no es válido', async () => {
    await assert.rejects(() => servicio.obtenerOferta(ninera, 999), NotFoundError);
    await assert.rejects(() => servicio.postular(ninera, 'abc'), NotFoundError);
  });

  test('rechaza un mensaje de postulación demasiado largo', async () => {
    const oferta = await servicio.publicarOferta(familia, datosOferta());
    await assert.rejects(() => servicio.postular(ninera, oferta.id, { mensaje: 'a'.repeat(501) }), ValidationError);
  });

  test('exige sesión iniciada', async () => {
    await assert.rejects(() => servicio.explorarOfertas(null), UnauthorizedError);
    await assert.rejects(() => servicio.publicarOferta({}, datosOferta()), UnauthorizedError);
  });

  test('aplica los roles también en el servicio, no solo en la ruta HTTP', async () => {
    await assert.rejects(
      () => servicio.explorarOfertas({ id: 10, tipo_usuario: 'FAMILIA' }),
      ForbiddenError,
    );
    await assert.rejects(
      () => servicio.publicarOferta({ id: 7, tipo_usuario: 'NINERA' }, {}),
      ForbiddenError,
    );
  });

  test('lista las postulaciones de la niñera y las ofertas de la familia', async () => {
    const oferta = await servicio.publicarOferta(familia, datosOferta());
    await servicio.postular(ninera, oferta.id);

    const postulaciones = await servicio.listarMisPostulaciones(ninera);
    assert.equal(postulaciones.length, 1);

    const ofertas = await servicio.listarMisOfertas(familia);
    assert.equal(ofertas.length, 1);
    assert.equal((await servicio.listarMisOfertas({ id: 50, tipo_usuario: 'FAMILIA' })).length, 0);
  });
});
