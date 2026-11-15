const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const ServicioBusqueda = require('../src/application/services/ServicioBusqueda');
const {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} = require('../src/domain/errors/DomainErrors');

const FAMILIA = { id: 10, tipo_usuario: 'FAMILIA' };

function crearServicio() {
  let filtrosRecibidos;
  let filtrosListado;
  const fila = {
    id_usuario: 7,
    nombre_usuario: 'Lucía',
    apellido_usuario: 'Valdez',
    correo: 'privado@minana.com',
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
  };
  const servicio = new ServicioBusqueda({
    userRepository: {
      async buscarNinerasCercanas(filtros) {
        filtrosRecibidos = filtros;
        return [fila];
      },
      async listarNinerasDisponibles(filtros) {
        filtrosListado = filtros;
        return [{ ...fila, distancia_km: null }];
      },
    },
  });
  return {
    servicio,
    obtenerFiltros: () => filtrosRecibidos,
    obtenerFiltrosListado: () => filtrosListado,
  };
}

describe('ServicioBusqueda HU11', () => {
  test('filtra por cercanía y no expone correo ni celular de la niñera', async () => {
    const { servicio, obtenerFiltros } = crearServicio();

    const resultado = await servicio.buscarNineras(FAMILIA, {
      latitud: -12.12,
      longitud: -77.03,
      radioKm: 5,
      tarifaMaxima: 35,
      experienciaMinima: 3,
    });

    assert.deepEqual(obtenerFiltros(), {
      latitud: -12.12,
      longitud: -77.03,
      radioKm: 5,
      tarifaMaxima: 35,
      experienciaMinima: 3,
    });
    assert.equal(resultado.total, 1);
    assert.equal(resultado.resultados[0].distanciaKm, 2.35);
    assert.equal(resultado.resultados[0].correo, undefined);
    assert.equal(resultado.resultados[0].celular, undefined);
  });

  test('exige sesión y no consulta el repositorio sin usuario', async () => {
    const { servicio, obtenerFiltros } = crearServicio();
    await assert.rejects(() => servicio.buscarNineras(null, {}), UnauthorizedError);
    assert.equal(obtenerFiltros(), undefined);
  });

  test('solo una familia puede buscar niñeras', async () => {
    const { servicio } = crearServicio();
    await assert.rejects(
      () => servicio.buscarNineras({ id: 7, tipo_usuario: 'NINERA' }, { latitud: -12, longitud: -77 }),
      ForbiddenError,
    );
  });

  test('rechaza una latitud fuera de rango y un radio mayor a 100 km', async () => {
    const { servicio } = crearServicio();
    await assert.rejects(
      () => servicio.buscarNineras(FAMILIA, { latitud: 100, longitud: -77, radioKm: 101 }),
      ValidationError,
    );
  });

  test('permite explorar candidatas verificadas sin compartir la ubicación', async () => {
    const { servicio, obtenerFiltrosListado } = crearServicio();
    const resultado = await servicio.buscarNineras(FAMILIA, {
      tarifaMaxima: 35,
      experienciaMinima: 3,
    });

    assert.deepEqual(obtenerFiltrosListado(), {
      tarifaMaxima: 35,
      experienciaMinima: 3,
    });
    assert.equal(resultado.usaUbicacion, false);
    assert.equal(resultado.radioKm, null);
    assert.equal(resultado.resultados[0].distanciaKm, null);
  });
});
