const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const PostgresUserRepository = require('../src/infrastructure/adapters/db/PostgresUserRepository');

describe('PostgresUserRepository', () => {
  test('reintenta una consulta de lectura al restablecerse una conexión transitoria', async () => {
    let intentos = 0;
    const pool = {
      async query() {
        intentos += 1;
        if (intentos === 1) {
          const error = new Error('connection terminated unexpectedly');
          error.code = 'ECONNRESET';
          throw error;
        }
        return { rows: [{ id_usuario: 1, nombre_usuario: 'Familia', apellido_usuario: 'Prueba', correo: 'familia@test.com', dni: '123', contrasena_hash: 'hash', celular: null, tipo_usuario: 'FAMILIA', estado_cuenta: 'ACTIVA' }] };
      },
    };
    const repositorio = new PostgresUserRepository(pool);
    const usuario = await repositorio.findByEmail('familia@test.com');
    assert.equal(usuario.correo, 'familia@test.com');
    assert.equal(intentos, 2);
  });

  test('no reintenta errores no transitorios', async () => {
    let intentos = 0;
    const error = new Error('la consulta es inválida');
    const pool = { async query() { intentos += 1; throw error; } };
    const repositorio = new PostgresUserRepository(pool);

    await assert.rejects(() => repositorio.findByEmail('familia@test.com'), error);
    assert.equal(intentos, 1);
  });
});
