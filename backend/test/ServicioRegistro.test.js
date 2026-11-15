const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioRegistro = require('../src/application/services/ServicioRegistro');

function crearServicio() {
  return new ServicioRegistro({
    userRepository: {
      findByEmail: async () => null,
      findByDni: async () => null,
    },
    passwordHasher: { hash: async () => 'hash' },
    tokenService: { generateToken: () => 'token' },
  });
}

function familiaValida(overrides = {}) {
  return {
    nombre: 'María',
    apellido: 'García',
    correo: 'maria@example.com',
    dni: '12345678',
    celular: '987654321',
    contrasena: 'Secreta123',
    nombreFamilia: 'Familia García',
    direccion: 'Av. Principal 123',
    numeroNinos: 1,
    edadesNinos: [5],
    ...overrides,
  };
}

describe('ServicioRegistro', () => {
  test('mantiene el límite de cinco hijos coherente con la gestión de perfiles', async () => {
    await assert.rejects(
      crearServicio().registrarPadre(
        familiaValida({
          numeroNinos: 6,
          edadesNinos: [1, 2, 3, 4, 5, 6],
        }),
      ),
      (error) =>
        error.name === 'ValidationError' &&
        error.fields.numeroNinos === 'Debe ser un número entero entre 1 y 5.',
    );
  });

  test('crea una sesión limitada para que la niñera complete su expediente', async () => {
    let payload;
    const servicio = new ServicioRegistro({
      userRepository: {
        findByEmail: async () => null,
        findByDni: async () => null,
        crearNinera: async () => ({
          id: 9,
          correo: 'lucia@example.com',
          nombreCompleto: 'Lucía Valdez',
          tipoUsuario: 'NINERA',
          estadoCuenta: 'PENDIENTE_VERIFICACION',
        }),
      },
      passwordHasher: { hash: async () => 'hash' },
      servicioNotificacion: { enviarNotificacion: async () => ({}) },
      tokenService: {
        generateToken: (datos) => {
          payload = datos;
          return 'token-limitado';
        },
      },
    });

    const resultado = await servicio.registrarNinera({
      nombre: 'Lucía', apellido: 'Valdez', correo: 'lucia@example.com',
      dni: '87654321', celular: '987654321', contrasena: 'Secreta123',
      experiencia: 'Tres años de cuidado infantil', tarifaHora: 25,
    });

    assert.equal(resultado.token, 'token-limitado');
    assert.equal(resultado.usuario.accesoLimitado, true);
    assert.equal(payload.accesoLimitado, true);
  });
});
