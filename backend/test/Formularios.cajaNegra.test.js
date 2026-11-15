/**
 * Caja negra (particiones de equivalencia y valores límite) de tres formularios:
 *  - "Registro de niñera" (HU3) - Gabriel Alva
 *  - "Registrar hijo" (HU7) - Yadhira Sarmiento
 *  - "Solicitar reserva" (HU15, origen del historial de HU16) - Rodrigo Salazar
 * Cada caso cambia un solo campo a partir de datos válidos. Se ejecutan contra
 * el servicio al que llama cada formulario, con repositorios en memoria.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const ServicioRegistro = require('../src/application/services/ServicioRegistro');
const ServicioHijo = require('../src/application/services/ServicioHijo');
const ServicioReserva = require('../src/application/services/ServicioReserva');
const Hijo = require('../src/domain/entities/Hijo');
const Reserva = require('../src/domain/entities/Reserva');
const Disponibilidad = require('../src/domain/entities/Disponibilidad');
const {
  ValidationError,
  ForbiddenError,
  EmailAlreadyExistsError,
  DniAlreadyExistsError,
} = require('../src/domain/errors/DomainErrors');

// Devuelve los campos con error, 'OK' si se guardó, o el nombre del error.
async function resultado(promesa) {
  try {
    await promesa;
    return 'OK';
  } catch (error) {
    if (error instanceof ValidationError) return Object.keys(error.fields).sort().join(',') || 'ValidationError';
    return error.name || error.constructor.name;
  }
}

// ---------------------------------------------------------------------------
// HU3 - Registro de niñera (Gabriel Alva)
// ---------------------------------------------------------------------------
describe('HU3 - formulario "Registro de niñera" - caja negra', () => {
  const NINERA = {
    nombre: 'Lucía', apellido: 'Valdez', correo: 'lucia.valdez@gmail.com', dni: '71234567',
    celular: '987654321', contrasena: 'clave1234', experiencia: 'Tres años en un nido.',
    tarifaHora: '25', descripcion: 'Responsable.',
  };
  function servicio() {
    return new ServicioRegistro({
      userRepository: {
        async findByEmail(c) { return c === 'ya.existe@gmail.com' ? { id: 1 } : null; },
        async findByDni(d) { return d === '70000000' ? { id: 1 } : null; },
        async crearNinera(u, n) {
          return { id: 30, nombreCompleto: `${u.nombre} ${u.apellido}`, correo: u.correo, tipoUsuario: 'NINERA', estadoCuenta: 'PENDIENTE_VERIFICACION', ...n };
        },
      },
      passwordHasher: { async hash(c) { return `hash(${c})`; } },
      tokenService: { generateToken() { return 'token-limitado'; } },
    });
  }
  const casos = [
    ['CN01 todos válidos', {}, 'OK'],
    ['CN02 contraseña de 8 caracteres (límite válido)', { contrasena: 'abcd1234' }, 'OK'],
    ['CN03 tarifa de 0,01 (límite válido)', { tarifaHora: '0.01' }, 'OK'],
    ['CN04 nombre vacío', { nombre: '' }, 'nombre'],
    ['CN05 apellido vacío', { apellido: ' ' }, 'apellido'],
    ['CN06 correo sin @', { correo: 'luciagmail.com' }, 'correo'],
    ['CN07 DNI de 7 dígitos', { dni: '7123456' }, 'dni'],
    ['CN08 DNI de 9 dígitos', { dni: '712345678' }, 'dni'],
    ['CN09 celular de 8 dígitos', { celular: '98765432' }, 'celular'],
    ['CN10 celular de 16 dígitos', { celular: '9876543210123456' }, 'celular'],
    ['CN11 contraseña de 7 caracteres', { contrasena: 'abc1234' }, 'contrasena'],
    ['CN12 experiencia vacía', { experiencia: '' }, 'experiencia'],
    ['CN13 tarifa vacía', { tarifaHora: '' }, 'tarifaHora'],
    ['CN14 tarifa 0 (límite inválido)', { tarifaHora: '0' }, 'tarifaHora'],
    ['CN15 correo ya registrado', { correo: 'ya.existe@gmail.com' }, 'EmailAlreadyExistsError'],
    ['CN16 DNI ya registrado', { dni: '70000000' }, 'DniAlreadyExistsError'],
  ];
  for (const [nombre, cambios, esperado] of casos) {
    test(nombre, async () => {
      assert.equal(await resultado(servicio().registrarNinera({ ...NINERA, ...cambios })), esperado);
    });
  }
  test('CN01 la cuenta queda PENDIENTE y recibe una sesión limitada', async () => {
    const r = await servicio().registrarNinera(NINERA);
    assert.equal(r.usuario.estado, 'PENDIENTE_VERIFICACION');
    assert.equal(r.usuario.accesoLimitado, true);
    assert.ok(EmailAlreadyExistsError && DniAlreadyExistsError);
  });
});

// ---------------------------------------------------------------------------
// HU7 - Registrar hijo (Yadhira Sarmiento)
// ---------------------------------------------------------------------------
describe('HU7 - formulario "Registrar hijo" - caja negra', () => {
  const HIJO = { nombre: 'Mateo', edad: 4, alergias: 'Maní', condicionesMedicas: '', notas: 'Duerme siesta.' };
  function servicio() {
    const hijos = [];
    return new ServicioHijo({
      hijoRepository: {
        async listarPorPadre(id) { return hijos.filter((h) => h.idPadre === id); },
        async crear(idPadre, datos) { const h = new Hijo({ id: hijos.length + 1, idPadre, ...datos }); hijos.push(h); return h; },
      },
    });
  }
  const casos = [
    ['CN01 todos válidos', {}, 'OK'],
    ['CN02 edad 0 (límite inferior válido)', { edad: 0 }, 'OK'],
    ['CN03 edad 17 (límite superior válido)', { edad: 17 }, 'OK'],
    ['CN04 nombre de 100 caracteres y textos de 500', { nombre: 'a'.repeat(100), alergias: 'b'.repeat(500), notas: 'c'.repeat(500) }, 'OK'],
    ['CN05 sin alergias, cuidados ni notas', { alergias: undefined, condicionesMedicas: undefined, notas: undefined }, 'OK'],
    ['CN06 nombre vacío', { nombre: '' }, 'nombre'],
    ['CN07 nombre de 101 caracteres', { nombre: 'a'.repeat(101) }, 'nombre'],
    ['CN08 edad vacía', { edad: '' }, 'edad'],
    ['CN09 edad -1', { edad: -1 }, 'edad'],
    ['CN10 edad 18', { edad: 18 }, 'edad'],
    ['CN11 edad 2,5', { edad: 2.5 }, 'edad'],
    ['CN12 alergias que no son texto', { alergias: 123 }, 'alergias'],
    ['CN13 cuidados médicos de 501 caracteres', { condicionesMedicas: 'x'.repeat(501) }, 'condicionesMedicas'],
    ['CN14 notas de 501 caracteres', { notas: 'x'.repeat(501) }, 'notas'],
  ];
  for (const [nombre, cambios, esperado] of casos) {
    test(nombre, async () => {
      assert.equal(await resultado(servicio().registrarHijo(10, { ...HIJO, ...cambios })), esperado);
    });
  }
});

// ---------------------------------------------------------------------------
// HU15 / HU16 - Solicitar reserva (Rodrigo Salazar)
// ---------------------------------------------------------------------------
describe('HU15/HU16 - formulario "Solicitar reserva" - caja negra', () => {
  const FAMILIA = { id: 10, tipo_usuario: 'FAMILIA' };
  // "Ahora": martes 10/11/2026, 10:00 en Lima.
  const reloj = () => new Date('2026-11-10T15:00:00.000Z');
  const RESERVA = {
    idNinera: 5, idHijo: 1, fecha: '2026-11-16', horaInicio: '09:00', horaFin: '11:30',
    direccion: 'Av. Larco 123, Miraflores',
  };
  function servicio() {
    const reservas = [];
    return new ServicioReserva({
      reloj,
      reservaRepository: {
        async listarActivasDeNineraEnFecha() { return []; },
        async listarActivasDeHijoEnFecha() { return []; },
        async crearSiNoHaySolapamiento(r) { const g = new Reserva({ ...r, id: reservas.length + 1 }); reservas.push(g); return g; },
      },
      disponibilidadRepository: {
        async obtenerResumenNinera(id) { return id === 5 ? { idNinera: 5, estadoCuenta: 'ACTIVA', tarifaHora: 20 } : null; },
        async listarDisponibilidadPorRango() {
          return [new Disponibilidad({ id: 1, idNinera: 5, diaSemana: 'LUNES', horaInicio: '06:00', horaFin: '20:00' })];
        },
        async listarReservasActivasPorRango() { return []; },
      },
      hijoRepository: {
        async findById(id) {
          if (id === 1) return new Hijo({ id: 1, idPadre: 10, nombre: 'Lucía', edad: 4 });
          if (id === 2) return new Hijo({ id: 2, idPadre: 11, nombre: 'Mateo', edad: 6 });
          return null;
        },
      },
    });
  }
  const casos = [
    ['CN01 todos válidos (2 h 30 min)', {}, 'OK'],
    ['CN02 duración de 60 minutos (límite válido)', { horaInicio: '09:00', horaFin: '10:00' }, 'OK'],
    ['CN03 duración de 12 horas (límite válido)', { horaInicio: '06:00', horaFin: '18:00' }, 'OK'],
    ['CN04 dirección de 5 caracteres (límite válido)', { direccion: 'Jr. A' }, 'OK'],
    ['CN05 niñera no numérica', { idNinera: 'abc' }, 'idNinera'],
    ['CN06 niñera con id 0', { idNinera: 0 }, 'idNinera'],
    ['CN07 hijo no numérico', { idHijo: 'abc' }, 'idHijo'],
    ['CN08 hijo de otra familia', { idHijo: 2 }, 'ForbiddenError'],
    ['CN09 fecha con formato DD/MM/AAAA', { fecha: '16/11/2026' }, 'fecha'],
    ['CN10 fecha pasada', { fecha: '2026-11-09' }, 'fecha'],
    ['CN11 hora de inicio "9am"', { horaInicio: '9am' }, 'horaInicio'],
    ['CN12 hora de fin "25:00"', { horaFin: '25:00' }, 'horaFin'],
    ['CN13 hora de fin igual a la de inicio', { horaInicio: '09:00', horaFin: '09:00' }, 'horaFin'],
    ['CN14 duración de 59 minutos', { horaInicio: '09:00', horaFin: '09:59' }, 'horaFin'],
    ['CN15 duración de 12 h 01 min', { horaInicio: '06:00', horaFin: '18:01' }, 'horaFin'],
    ['CN16 dirección de 4 caracteres', { direccion: 'Jr A' }, 'direccion'],
    ['CN17 dirección de 256 caracteres', { direccion: 'x'.repeat(256) }, 'direccion'],
  ];
  for (const [nombre, cambios, esperado] of casos) {
    test(nombre, async () => {
      assert.equal(await resultado(servicio().solicitar(FAMILIA, { ...RESERVA, ...cambios })), esperado);
    });
  }
  test('CN01 la reserva queda Pendiente con el monto calculado (2,5 h x S/ 20)', async () => {
    const r = await servicio().solicitar(FAMILIA, RESERVA);
    assert.equal(r.estadoReserva, 'Pendiente');
    assert.equal(r.montoTotal, 50);
    assert.ok(ForbiddenError);
  });
});
