const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioHijo = require('../src/application/services/ServicioHijo');
const Hijo = require('../src/domain/entities/Hijo');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../src/domain/errors/DomainErrors');

/** Repositorio en memoria que reemplaza a PostgresHijoRepository en las pruebas. */
class HijoRepositoryEnMemoria {
  constructor() {
    this.hijos = [];
    this.siguienteId = 1;
  }

  async listarPorPadre(idPadre) {
    return this.hijos.filter((h) => h.idPadre === idPadre);
  }

  async findById(idHijo) {
    return this.hijos.find((h) => h.id === idHijo) || null;
  }

  async crear(idPadre, datos) {
    const hijo = new Hijo({ id: this.siguienteId++, idPadre, ...datos });
    this.hijos.push(hijo);
    return hijo;
  }

  async actualizar(idHijo, datos) {
    const indice = this.hijos.findIndex((h) => h.id === idHijo);
    if (indice === -1) return null;
    this.hijos[indice] = new Hijo({ id: idHijo, idPadre: this.hijos[indice].idPadre, ...datos });
    return this.hijos[indice];
  }
}

const ID_FAMILIA = 10;
const ID_OTRA_FAMILIA = 20;

describe('ServicioHijo', () => {
  let repositorio;
  let servicio;

  beforeEach(() => {
    repositorio = new HijoRepositoryEnMemoria();
    servicio = new ServicioHijo({ hijoRepository: repositorio });
  });

  test('registra el perfil de un hijo con alergias y cuidados médicos', async () => {
    const hijo = await servicio.registrarHijo(ID_FAMILIA, {
      nombre: '  Lucía ',
      edad: '4',
      alergias: 'Maní',
      condicionesMedicas: 'Asma leve, usa inhalador',
      notas: '',
    });

    assert.deepEqual(hijo, {
      id: 1,
      nombre: 'Lucía',
      edad: 4,
      alergias: 'Maní',
      condicionesMedicas: 'Asma leve, usa inhalador',
      notas: null,
    });
  });

  test('lista solo los hijos de la familia autenticada', async () => {
    await servicio.registrarHijo(ID_FAMILIA, { nombre: 'Lucía', edad: 4 });
    await servicio.registrarHijo(ID_OTRA_FAMILIA, { nombre: 'Mateo', edad: 7 });

    const hijos = await servicio.listarHijos(ID_FAMILIA);

    assert.equal(hijos.length, 1);
    assert.equal(hijos[0].nombre, 'Lucía');
  });

  test('rechaza datos inválidos indicando cada campo', async () => {
    await assert.rejects(
      servicio.registrarHijo(ID_FAMILIA, { nombre: ' ', edad: 18, alergias: 123 }),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.deepEqual(Object.keys(error.fields).sort(), ['alergias', 'edad', 'nombre']);
        return true;
      },
    );
  });

  test('rechaza una edad que no es entera', async () => {
    await assert.rejects(
      servicio.registrarHijo(ID_FAMILIA, { nombre: 'Lucía', edad: 2.5 }),
      (error) => error instanceof ValidationError && Boolean(error.fields.edad),
    );
  });

  test('exige sesión iniciada', async () => {
    await assert.rejects(servicio.listarHijos(null), UnauthorizedError);
    await assert.rejects(servicio.registrarHijo(undefined, { nombre: 'Lucía', edad: 4 }), UnauthorizedError);
  });

  test('edita el perfil de un hijo propio', async () => {
    const creado = await servicio.registrarHijo(ID_FAMILIA, { nombre: 'Lucía', edad: 4 });

    const editado = await servicio.actualizarHijo(ID_FAMILIA, String(creado.id), {
      nombre: 'Lucía',
      edad: 5,
      alergias: 'Lactosa',
      condicionesMedicas: null,
    });

    assert.equal(editado.edad, 5);
    assert.equal(editado.alergias, 'Lactosa');
    assert.equal(editado.condicionesMedicas, null);
  });

  test('no permite editar el hijo de otra familia', async () => {
    const ajeno = await servicio.registrarHijo(ID_OTRA_FAMILIA, { nombre: 'Mateo', edad: 7 });

    await assert.rejects(
      servicio.actualizarHijo(ID_FAMILIA, ajeno.id, { nombre: 'Mateo', edad: 8 }),
      ForbiddenError,
    );
    assert.equal((await repositorio.findById(ajeno.id)).edad, 7);
  });

  test('responde 404 si el hijo no existe o el id no es válido', async () => {
    await assert.rejects(servicio.actualizarHijo(ID_FAMILIA, 999, { nombre: 'X', edad: 1 }), NotFoundError);
    await assert.rejects(servicio.actualizarHijo(ID_FAMILIA, 'abc', { nombre: 'X', edad: 1 }), NotFoundError);
  });
});
