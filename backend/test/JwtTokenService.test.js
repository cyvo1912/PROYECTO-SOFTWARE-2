const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const JwtTokenService = require('../src/infrastructure/adapters/security/JwtTokenService');

class RevocacionEnMemoria {
  constructor() {
    this.filas = new Map();
  }
  async guardar(huella, expiraEn) {
    this.filas.set(huella, expiraEn);
  }
  async listarVigentes() {
    return [...this.filas].filter(([, exp]) => exp > new Date()).map(([h]) => h);
  }
  async eliminarExpirados() {
    for (const [h, exp] of this.filas) if (exp <= new Date()) this.filas.delete(h);
  }
}

describe('JwtTokenService - secreto y revocación', () => {
  test('rechaza arrancar sin JWT_SECRET o con un valor de ejemplo', () => {
    assert.throws(() => JwtTokenService.resolverSecreto({}), /JWT_SECRET/);
    assert.throws(
      () => JwtTokenService.resolverSecreto({ JWT_SECRET: 'minana_jwt_secret_key_2026' }),
      /JWT_SECRET/,
    );
    assert.throws(
      () => JwtTokenService.resolverSecreto({ JWT_SECRET: 'tu_clave_secreta_jwt' }),
      /JWT_SECRET/,
    );
  });

  test('usa el secreto del entorno y genera uno aleatorio solo en pruebas', () => {
    assert.equal(JwtTokenService.resolverSecreto({ JWT_SECRET: 'secreto_real_123' }), 'secreto_real_123');
    const a = JwtTokenService.resolverSecreto({ NODE_ENV: 'test' });
    const b = JwtTokenService.resolverSecreto({ NODE_ENV: 'test' });
    assert.equal(a.length, 64);
    assert.notEqual(a, b);
  });

  test('un token revocado sigue inválido tras reiniciar el servidor', async () => {
    const repo = new RevocacionEnMemoria();
    const servicio = new JwtTokenService('secreto_prueba', '7d', repo);
    const token = servicio.generateToken({ id: 1, correo: 'a@b.com', tipo_usuario: 'FAMILIA' });

    await servicio.invalidateToken(token);
    assert.throws(() => servicio.verifyToken(token), /revocado/);
    assert.equal(repo.filas.size, 1);
    assert.ok(![...repo.filas.keys()].includes(token), 'no debe guardar el token en claro');

    const reiniciado = new JwtTokenService('secreto_prueba', '7d', repo);
    assert.equal(reiniciado.verifyToken(token).id, 1);
    assert.equal(await reiniciado.cargarRevocados(), 1);
    assert.throws(() => reiniciado.verifyToken(token), /revocado/);
  });

  test('descarta revocaciones ya expiradas al cargar', async () => {
    const repo = new RevocacionEnMemoria();
    repo.filas.set('vieja', new Date(Date.now() - 1000));
    const servicio = new JwtTokenService('secreto_prueba', '7d', repo);
    assert.equal(await servicio.cargarRevocados(), 0);
    assert.equal(repo.filas.size, 0);
  });

  test('ignora textos arbitrarios, tokens ajenos y expirados al cerrar sesión', async () => {
    const repo = new RevocacionEnMemoria();
    const servicio = new JwtTokenService('secreto_prueba', '7d', repo);
    const ajeno = new JwtTokenService('otro_secreto').generateToken({ id: 2, tipo_usuario: 'FAMILIA' });
    const expirado = new JwtTokenService('secreto_prueba', '-1s').generateToken({ id: 3, tipo_usuario: 'FAMILIA' });

    assert.equal(await servicio.invalidateToken('basura'), false);
    assert.equal(await servicio.invalidateToken(ajeno), false);
    assert.equal(await servicio.invalidateToken(expirado), false);
    assert.equal(repo.filas.size, 0);
    assert.equal(servicio.blacklistedTokens.size, 0);
  });
});
