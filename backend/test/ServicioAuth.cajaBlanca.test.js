/**
 * HU4 - Caja blanca de ServicioAuth.iniciarSesion (Gabriel Alva).
 * Un caso por cada camino independiente del grafo de flujo (V(G) = 10).
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const ServicioAuth = require('../src/application/services/ServicioAuth');
const Usuario = require('../src/domain/entities/Usuario');
const {
  InvalidCredentialsError,
  AccountPendingError,
  AccountInactiveError,
  RoleMismatchError,
} = require('../src/domain/errors/DomainErrors');

function usuario(tipoUsuario, estadoCuenta) {
  return new Usuario({
    id: 20,
    nombre: 'Ana',
    apellido: 'Pérez',
    correo: 'ana@minana.com',
    contrasenaHash: 'hash-correcto',
    tipoUsuario,
    estadoCuenta,
    dni: '12345678',
    celular: '987654321',
  });
}

function crearServicio(encontrado) {
  const llamadas = { buscados: [], detalles: [] };
  const servicio = new ServicioAuth({
    userRepository: {
      async findByEmail(correo) { llamadas.buscados.push(correo); return encontrado; },
      async findNineraDetails(id) { llamadas.detalles.push(['NINERA', id]); return { zona: 'Miraflores' }; },
      async findPadreDetails(id) { llamadas.detalles.push(['FAMILIA', id]); return { nombreFamilia: 'Familia Pérez' }; },
    },
    passwordHasher: { async compare(plano, hash) { return plano === 'Clave1234' && hash === 'hash-correcto'; } },
    tokenService: { generateToken(payload) { return `token-${payload.tipo_usuario}${payload.accesoLimitado ? '-limitado' : ''}`; } },
  });
  return { servicio, llamadas };
}

describe('ServicioAuth.iniciarSesion - caja blanca (HU4)', () => {
  test('C1: correo o contraseña vacíos', async () => {
    const { servicio, llamadas } = crearServicio(null);
    await assert.rejects(() => servicio.iniciarSesion('', 'Clave1234'), InvalidCredentialsError);
    assert.equal(llamadas.buscados.length, 0);
  });

  test('C2: el correo no está registrado', async () => {
    const { servicio } = crearServicio(null);
    await assert.rejects(() => servicio.iniciarSesion('nadie@minana.com', 'Clave1234'), InvalidCredentialsError);
  });

  test('C3: contraseña incorrecta', async () => {
    const { servicio } = crearServicio(usuario('FAMILIA', 'ACTIVA'));
    await assert.rejects(() => servicio.iniciarSesion('ana@minana.com', 'otraClave'), InvalidCredentialsError);
  });

  test('C4: el rol elegido en la app no coincide con la cuenta', async () => {
    const { servicio } = crearServicio(usuario('FAMILIA', 'ACTIVA'));
    await assert.rejects(() => servicio.iniciarSesion('ana@minana.com', 'Clave1234', 'NINERA'), RoleMismatchError);
  });

  test('C5: cuenta pendiente que no es de niñera', async () => {
    const { servicio } = crearServicio(usuario('FAMILIA', 'PENDIENTE_VERIFICACION'));
    await assert.rejects(() => servicio.iniciarSesion('ana@minana.com', 'Clave1234'), AccountPendingError);
  });

  test('C6: niñera pendiente recibe una sesión limitada', async () => {
    const { servicio, llamadas } = crearServicio(usuario('NINERA', 'PENDIENTE_VERIFICACION'));
    const r = await servicio.iniciarSesion('ana@minana.com', 'Clave1234');
    assert.equal(r.token, 'token-NINERA-limitado');
    assert.equal(r.usuario.accesoLimitado, true);
    assert.equal(llamadas.detalles.length, 0);
  });

  test('C7: cuenta suspendida', async () => {
    const { servicio } = crearServicio(usuario('FAMILIA', 'SUSPENDIDA'));
    await assert.rejects(() => servicio.iniciarSesion('ana@minana.com', 'Clave1234'), AccountInactiveError);
  });

  test('C8: niñera activa: token y datos de niñera', async () => {
    const { servicio, llamadas } = crearServicio(usuario('NINERA', 'ACTIVA'));
    const r = await servicio.iniciarSesion(' ANA@minana.com ', 'Clave1234');
    assert.equal(r.token, 'token-NINERA');
    assert.deepEqual(r.usuario.detalles, { zona: 'Miraflores' });
    assert.deepEqual(llamadas.buscados, ['ana@minana.com']);
  });

  test('C9: familia activa: token y datos de la familia', async () => {
    const { servicio, llamadas } = crearServicio(usuario('FAMILIA', 'ACTIVA'));
    const r = await servicio.iniciarSesion('ana@minana.com', 'Clave1234');
    assert.equal(r.token, 'token-FAMILIA');
    assert.deepEqual(r.usuario.detalles, { nombreFamilia: 'Familia Pérez' });
    assert.deepEqual(llamadas.detalles, [['FAMILIA', 20]]);
  });

  test('C10: administrador activo: token sin datos de perfil específicos', async () => {
    const { servicio, llamadas } = crearServicio(usuario('ADMIN', 'ACTIVA'));
    const r = await servicio.iniciarSesion('ana@minana.com', 'Clave1234');
    assert.equal(r.token, 'token-ADMIN');
    assert.equal(r.usuario.detalles, null);
    assert.equal(llamadas.detalles.length, 0);
  });
});
