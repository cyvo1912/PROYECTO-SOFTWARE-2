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
  test('la sesión limitada de una niñera solo permite completar multimedia', async () => {
    const auth = crearAuthMiddleware({
      verifyToken: () => ({ id: 8, tipo_usuario: 'NINERA', accesoLimitado: true }),
    });
    const reqBloqueada = {
      headers: { authorization: 'Bearer token-limitado' },
      baseUrl: '/api/ofertas',
    };
    const resBloqueada = respuesta();
    await auth.autenticar(reqBloqueada, resBloqueada, () => assert.fail('No debe continuar'));
    assert.equal(resBloqueada.statusCode, 403);

    const reqExpediente = {
      headers: { authorization: 'Bearer token-limitado' },
      baseUrl: '/api/multimedia',
    };
    const resExpediente = respuesta();
    let continuo = false;
    await auth.autenticar(reqExpediente, resExpediente, () => { continuo = true; });
    assert.equal(continuo, true);
    assert.equal(reqExpediente.user.id, 8);
  });

  test('rechaza al instante la sesión de una cuenta suspendida', async () => {
    const auth = crearAuthMiddleware(
      { verifyToken: () => ({ id: 8, tipo_usuario: 'NINERA', accesoLimitado: false }) },
      { findById: async () => ({ id: 8, tipoUsuario: 'NINERA', estadoCuenta: 'SUSPENDIDA' }) },
    );
    const res = respuesta();
    await auth.autenticar({ headers: { authorization: 'Bearer vigente' }, baseUrl: '/api/reservas' }, res, () => assert.fail('No debe continuar'));
    assert.equal(res.statusCode, 403);
  });
});
