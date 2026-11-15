const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crearAuthMiddleware = require('../src/infrastructure/http/middlewares/authMiddleware');

function respuesta() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('authMiddleware', () => {
  test('la sesión limitada de una niñera solo permite completar multimedia', () => {
    const auth = crearAuthMiddleware({
      verifyToken: () => ({ id: 8, tipo_usuario: 'NINERA', accesoLimitado: true }),
    });
    const reqBloqueada = {
      headers: { authorization: 'Bearer token-limitado' },
      baseUrl: '/api/ofertas',
    };
    const resBloqueada = respuesta();
    auth.autenticar(reqBloqueada, resBloqueada, () => assert.fail('No debe continuar'));
    assert.equal(resBloqueada.statusCode, 403);

    const reqExpediente = {
      headers: { authorization: 'Bearer token-limitado' },
      baseUrl: '/api/multimedia',
    };
    const resExpediente = respuesta();
    let continuo = false;
    auth.autenticar(reqExpediente, resExpediente, () => { continuo = true; });
    assert.equal(continuo, true);
    assert.equal(reqExpediente.user.id, 8);
  });
});
