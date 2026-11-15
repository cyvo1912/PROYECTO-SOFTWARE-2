const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const ServicioUsuario = require('../src/application/services/ServicioUsuario');
const Usuario = require('../src/domain/entities/Usuario');
const { ForbiddenError, ValidationError } = require('../src/domain/errors/DomainErrors');

describe('ServicioUsuario', () => {
  let usuario;
  let actualizacion;
  let servicio;

  beforeEach(() => {
    usuario = new Usuario({
      id: 7,
      nombre: 'Lucía',
      apellido: 'Valdez',
      correo: 'lucia@minana.com',
      dni: '12345678',
      celular: '999111222',
      tipoUsuario: 'NINERA',
      estadoCuenta: 'ACTIVA',
    });
    actualizacion = null;
    servicio = new ServicioUsuario({
      userRepository: {
        async findById(id) { return Number(id) === 7 ? usuario : null; },
        async actualizarPerfilNinera(id, datosUsuario, datosNinera) {
          actualizacion = { id, datosUsuario, datosNinera };
          return {
            ...usuario,
            ...datosUsuario,
            idNinera: 7,
            ...datosNinera,
            nombreCompleto: `${datosUsuario.nombre} ${datosUsuario.apellido}`,
          };
        },
      },
    });
  });

  test('actualiza el perfil de la niñera autenticada sin aceptar un id objetivo del cliente', async () => {
    const resultado = await servicio.actualizarPerfilNinera(7, {
      id: 999,
      nombre: 'Lucía',
      apellido: 'Valdez',
      celular: '999111222',
      experiencia: 'Cinco años de cuidado infantil.',
      tarifaHora: 30,
      zona: 'Miraflores',
      sobreMi: 'Atenta y responsable.',
      anosExperiencia: 5,
    });

    assert.equal(actualizacion.id, 7);
    assert.equal(actualizacion.datosNinera.tarifaHora, 30);
    assert.equal(resultado.detalles.anosExperiencia, 5);
  });

  test('no permite que un usuario de otro rol actualice un perfil de niñera', async () => {
    usuario.tipoUsuario = 'FAMILIA';
    await assert.rejects(
      () => servicio.actualizarPerfilNinera(7, {}),
      ForbiddenError,
    );
  });

  test('acumula los errores de los campos de perfil inválidos', async () => {
    await assert.rejects(
      () => servicio.actualizarPerfilNinera(7, {
        nombre: '',
        apellido: '',
        celular: 'abc',
        experiencia: '',
        tarifaHora: 0,
        anosExperiencia: 80,
      }),
      (error) => error instanceof ValidationError && Object.keys(error.fields).length === 6,
    );
  });
});
