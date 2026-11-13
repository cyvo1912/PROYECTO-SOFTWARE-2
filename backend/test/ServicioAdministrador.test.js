const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const ServicioAdministrador = require('../src/application/services/ServicioAdministrador');

const admin = { id: 1, tipo_usuario: 'ADMIN' };
const almacenamiento = { generarUrlTemporal: () => 'https://files.example/doc' };

function crearServicio(overrides = {}) {
  return new ServicioAdministrador({
    administradorRepository: {
      listarUsuarios: async () => [],
      actualizarEstadoCuenta: async () => ({
        id_usuario: 2,
        estado_cuenta: 'SUSPENDIDA',
      }),
      ...overrides,
    },
    almacenamiento,
  });
}

describe('ServicioAdministrador HU10', () => {
  test('lista datos generales sin exponer información de autenticación', async () => {
    const servicio = crearServicio({
      listarUsuarios: async () => [
        {
          id_usuario: 2,
          nombre_usuario: 'Ana',
          apellido_usuario: 'Pérez',
          correo: 'ana@example.com',
          dni: '12345678',
          celular: '999111222',
          tipo_usuario: 'FAMILIA',
          estado_cuenta: 'ACTIVA',
          fecha_registro: '2026-10-01T12:00:00.000Z',
          contrasena_hash: 'no debe exponerse',
        },
      ],
    });

    assert.deepEqual(await servicio.listarUsuarios(admin), [
      {
        id: 2,
        nombre: 'Ana Pérez',
        correo: 'ana@example.com',
        dni: '12345678',
        celular: '999111222',
        tipo: 'FAMILIA',
        estado: 'ACTIVA',
        fechaRegistro: '2026-10-01T12:00:00.000Z',
      },
    ]);
  });

  test('requiere privilegios de administrador para consultar usuarios', async () => {
    await assert.rejects(
      crearServicio().listarUsuarios({ id: 2, tipo_usuario: 'FAMILIA' }),
      { name: 'ForbiddenError', statusCode: 403 },
    );
  });

  test('actualiza el estado después de validar id y estado', async () => {
    let argumentos;
    const servicio = crearServicio({
      actualizarEstadoCuenta: async (...args) => {
        argumentos = args;
        return { id_usuario: 2, estado_cuenta: 'SUSPENDIDA' };
      },
    });

    assert.deepEqual(
      await servicio.actualizarEstadoCuenta(admin, '2', 'SUSPENDIDA'),
      { id: 2, estado: 'SUSPENDIDA' },
    );
    assert.deepEqual(argumentos, [2, 'SUSPENDIDA']);
  });

  test('rechaza ids y estados no válidos', async () => {
    const servicio = crearServicio();
    await assert.rejects(
      servicio.actualizarEstadoCuenta(admin, '0', 'SUSPENDIDA'),
      { name: 'ValidationError', statusCode: 400 },
    );
    await assert.rejects(
      servicio.actualizarEstadoCuenta(admin, '2', 'PENDIENTE_VERIFICACION'),
      { name: 'ValidationError', statusCode: 400 },
    );
  });

  test('no permite al administrador desactivar su propia cuenta', async () => {
    await assert.rejects(
      crearServicio().actualizarEstadoCuenta(admin, 1, 'SUSPENDIDA'),
      { name: 'ForbiddenError', statusCode: 403 },
    );
  });

  test('exige verificación antes de modificar el estado de una niñera', async () => {
    const servicio = crearServicio({
      actualizarEstadoCuenta: async () => ({ bloqueadoPorVerificacion: true }),
    });
    for (const estado of ['ACTIVA', 'SUSPENDIDA']) {
      await assert.rejects(
        servicio.actualizarEstadoCuenta(admin, 2, estado),
        {
          name: 'ValidationError',
          statusCode: 400,
          message:
            'La cuenta de niñera debe completar la verificación antes de modificar su estado.',
        },
      );
    }
  });

  test('devuelve no encontrado cuando el usuario no existe', async () => {
    const servicio = crearServicio({ actualizarEstadoCuenta: async () => null });
    await assert.rejects(
      servicio.actualizarEstadoCuenta(admin, 404, 'SUSPENDIDA'),
      { name: 'NotFoundError', statusCode: 404 },
    );
  });
});
