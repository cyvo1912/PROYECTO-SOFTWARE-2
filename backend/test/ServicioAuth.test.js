const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioAuth = require('../src/application/services/ServicioAuth');
const Usuario = require('../src/domain/entities/Usuario');

function crearNineraPendiente() {
  return {
    id: 8,
    correo: 'pendiente@example.com',
    contrasenaHash: 'hash',
    nombreCompleto: 'Lucía Pendiente',
    nombre: 'Lucía',
    apellido: 'Pendiente',
    tipoUsuario: 'NINERA',
    estadoCuenta: 'PENDIENTE_VERIFICACION',
    coincideConRol: (rol) => rol === 'NINERA',
    estaPendienteVerificacion: () => true,
    estaActivo: () => false,
  };
}

describe('ServicioAuth', () => {
  test('acepta el nombre visible del rol Niñera al validar la sesión móvil', async () => {
    const nineraActiva = new Usuario({
      id: 9,
      correo: 'ninera@example.com',
      contrasenaHash: 'hash',
      nombre: 'Lucía',
      apellido: 'Valdez',
      tipoUsuario: 'NINERA',
      estadoCuenta: 'ACTIVA',
    });
    const servicio = new ServicioAuth({
      userRepository: { findByEmail: async () => nineraActiva, findNineraDetails: async () => null },
      passwordHasher: { compare: async () => true },
      tokenService: { generateToken: () => 'token-ninera' },
    });

    const resultado = await servicio.iniciarSesion('ninera@example.com', 'Secreta123', 'Niñera');

    assert.equal(resultado.token, 'token-ninera');
    assert.equal(resultado.usuario.rol, 'NINERA');
  });

  test('entrega acceso limitado a una niñera pendiente solo para completar su expediente', async () => {
    let payload;
    const servicio = new ServicioAuth({
      userRepository: { findByEmail: async () => crearNineraPendiente() },
      passwordHasher: { compare: async () => true },
      tokenService: {
        generateToken: (datos) => {
          payload = datos;
          return 'token-limitado';
        },
      },
    });

    const resultado = await servicio.iniciarSesion(
      'pendiente@example.com',
      'Secreta123',
      'NINERA',
    );

    assert.equal(resultado.token, 'token-limitado');
    assert.equal(resultado.usuario.accesoLimitado, true);
    assert.equal(payload.accesoLimitado, true);
  });
});
