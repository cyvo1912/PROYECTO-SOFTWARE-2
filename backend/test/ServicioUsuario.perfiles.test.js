/**
 * HU6 (Genessi Ávila) y HU5 (Rodrigo Soto): caja blanca y caja negra de la
 * edición de perfiles en ServicioUsuario. Cada prueba es un camino del grafo
 * de flujo o un caso de la tabla de particiones de equivalencia del informe.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const ServicioUsuario = require('../src/application/services/ServicioUsuario');
const Usuario = require('../src/domain/entities/Usuario');
const {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  CriticalFieldModificationError,
} = require('../src/domain/errors/DomainErrors');

function crearServicio(tipoUsuario) {
  const registro = { guardado: null };
  const usuario = tipoUsuario
    ? new Usuario({
      id: 10, nombre: 'Ana', apellido: 'Pérez', correo: 'ana@mail.com', dni: '12345678',
      celular: '987654321', tipoUsuario, estadoCuenta: 'ACTIVA',
    })
    : null;
  const servicio = new ServicioUsuario({
    userRepository: {
      async findById(id) { return Number(id) === 10 ? usuario : null; },
      async findPadreDetails() { return { numero_ninos: 1, edades_ninos: '4' }; },
      async actualizarPerfilPadre(id, datosUsuario, datosPadre) {
        registro.guardado = { id, datosUsuario, datosPadre };
        return { ...usuario, ...datosUsuario, ...datosPadre, nombreCompleto: `${datosUsuario.nombre} ${datosUsuario.apellido}` };
      },
      async actualizarPerfilNinera(id, datosUsuario, datosNinera) {
        registro.guardado = { id, datosUsuario, datosNinera };
        return { ...usuario, ...datosUsuario, ...datosNinera, idNinera: id, nombreCompleto: `${datosUsuario.nombre} ${datosUsuario.apellido}` };
      },
    },
  });
  return { servicio, registro };
}

// Devuelve los campos con error, o 'OK' si el perfil se guardó.
async function resultado(promesa) {
  try {
    await promesa;
    return 'OK';
  } catch (error) {
    if (error instanceof ValidationError) return Object.keys(error.fields).sort().join(',');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// HU6 - Genessi Ávila
// ---------------------------------------------------------------------------
const FAMILIA_VALIDA = {
  nombre: 'Ana', apellido: 'Pérez', celular: '987654321',
  nombreFamilia: 'Familia Pérez', direccion: 'Av. Javier Prado 123',
};

describe('HU6 - ServicioUsuario.actualizarPerfilPadre - caja blanca (V(G) = 6)', () => {
  test('C1: sin sesión', async () => {
    const { servicio } = crearServicio('FAMILIA');
    await assert.rejects(() => servicio.actualizarPerfilPadre(null, FAMILIA_VALIDA), UnauthorizedError);
  });
  test('C2: el usuario no existe', async () => {
    const { servicio } = crearServicio(null);
    await assert.rejects(() => servicio.actualizarPerfilPadre(10, FAMILIA_VALIDA), NotFoundError);
  });
  test('C3: el usuario no es de tipo FAMILIA', async () => {
    const { servicio } = crearServicio('NINERA');
    await assert.rejects(() => servicio.actualizarPerfilPadre(10, FAMILIA_VALIDA), ForbiddenError);
  });
  test('C4: intenta cambiar el DNI', async () => {
    const { servicio } = crearServicio('FAMILIA');
    await assert.rejects(() => servicio.actualizarPerfilPadre(10, { ...FAMILIA_VALIDA, dni: '87654321' }), CriticalFieldModificationError);
  });
  test('C5: intenta cambiar el correo', async () => {
    const { servicio } = crearServicio('FAMILIA');
    await assert.rejects(() => servicio.actualizarPerfilPadre(10, { ...FAMILIA_VALIDA, correo: 'otro@mail.com' }), CriticalFieldModificationError);
  });
  test('C6: datos válidos actualizan el perfil', async () => {
    const { servicio, registro } = crearServicio('FAMILIA');
    const r = await servicio.actualizarPerfilPadre(10, FAMILIA_VALIDA);
    assert.equal(registro.guardado.id, 10);
    assert.equal(r.nombre, 'Ana');
  });
});

describe('HU6 - formulario "Editar perfil de familia" - caja negra', () => {
  const casos = [
    ['CN01 todos válidos', {}, 'OK'],
    ['CN02 dirección vacía (opcional)', { direccion: '' }, 'OK'],
    ['CN03 nombre vacío', { nombre: '' }, 'nombre'],
    ['CN04 nombre solo con espacios', { nombre: '   ' }, 'nombre'],
    ['CN05 apellido vacío', { apellido: '' }, 'apellido'],
    ['CN06 celular vacío', { celular: '' }, 'celular'],
    ['CN07 celular de 8 dígitos', { celular: '98765432' }, 'celular'],
    ['CN08 celular de 9 dígitos', { celular: '987654321' }, 'OK'],
    ['CN09 celular de 15 dígitos', { celular: '987654321012345' }, 'OK'],
    ['CN10 celular de 16 dígitos', { celular: '9876543210123456' }, 'celular'],
    ['CN11 celular con letras', { celular: '98765abcd' }, 'celular'],
    ['CN12 celular con +51, espacios y guiones', { celular: '+51 987-654-321' }, 'OK'],
    ['CN13 nombre de familia vacío', { nombreFamilia: '' }, 'nombreFamilia'],
    ['CN14 cuatro campos obligatorios vacíos', { nombre: '', apellido: '', celular: '', nombreFamilia: '' }, 'apellido,celular,nombre,nombreFamilia'],
  ];
  for (const [nombre, cambios, esperado] of casos) {
    test(nombre, async () => {
      const { servicio } = crearServicio('FAMILIA');
      assert.equal(await resultado(servicio.actualizarPerfilPadre(10, { ...FAMILIA_VALIDA, ...cambios })), esperado);
    });
  }
  test('CN02 guarda la dirección vacía como null', async () => {
    const { servicio, registro } = crearServicio('FAMILIA');
    await servicio.actualizarPerfilPadre(10, { ...FAMILIA_VALIDA, direccion: '' });
    assert.equal(registro.guardado.datosPadre.direccion, null);
  });
});

// ---------------------------------------------------------------------------
// HU5 - Rodrigo Soto
// ---------------------------------------------------------------------------
const NINERA_VALIDA = {
  nombre: 'Lucía', apellido: 'Valdez', celular: '987654321',
  experiencia: 'Cinco años cuidando niños de 2 a 8 años.', tarifaHora: '25',
  zona: 'Miraflores', descripcion: 'Responsable y puntual.',
};

describe('HU5 - ServicioUsuario.actualizarPerfilNinera - caja blanca de la validación de campos (V(G) = 10)', () => {
  const caminos = [
    ['C1 nombre vacío', { nombre: '' }, 'nombre'],
    ['C2 apellido vacío', { apellido: '' }, 'apellido'],
    ['C3 celular vacío', { celular: '' }, 'celular'],
    ['C4 celular con formato inválido', { celular: '98765abcd' }, 'celular'],
    ['C5 experiencia vacía', { experiencia: '' }, 'experiencia'],
    ['C6 tarifa vacía', { tarifaHora: '' }, 'tarifaHora'],
    ['C7 tarifa igual a 0', { tarifaHora: '0' }, 'tarifaHora'],
    ['C8 años de experiencia fuera de rango (61)', { anosExperiencia: 61 }, 'anosExperiencia'],
    ['C9 años de experiencia válidos (5)', { anosExperiencia: 5 }, 'OK'],
    ['C10 todos los campos válidos, sin años', {}, 'OK'],
  ];
  for (const [nombre, cambios, esperado] of caminos) {
    test(nombre, async () => {
      const { servicio } = crearServicio('NINERA');
      assert.equal(await resultado(servicio.actualizarPerfilNinera(10, { ...NINERA_VALIDA, ...cambios })), esperado);
    });
  }
  test('C9 guarda los años como número', async () => {
    const { servicio, registro } = crearServicio('NINERA');
    await servicio.actualizarPerfilNinera(10, { ...NINERA_VALIDA, anosExperiencia: '5' });
    assert.equal(registro.guardado.datosNinera.anosExperiencia, 5);
  });
});

describe('HU5 - formulario "Editar perfil de niñera" - caja negra', () => {
  const casos = [
    ['CN01 todos válidos', {}, 'OK'],
    ['CN02 tarifa de 0,01 (límite válido)', { tarifaHora: '0.01' }, 'OK'],
    ['CN03 zona y descripción vacías (opcionales)', { zona: '', descripcion: '' }, 'OK'],
    ['CN04 nombre solo con espacios', { nombre: '   ' }, 'nombre'],
    ['CN05 apellido vacío', { apellido: '' }, 'apellido'],
    ['CN06 celular vacío', { celular: '' }, 'celular'],
    ['CN07 celular de 8 dígitos', { celular: '98765432' }, 'celular'],
    ['CN08 celular de 16 dígitos', { celular: '9876543210123456' }, 'celular'],
    ['CN09 celular con letras', { celular: '98765abcd' }, 'celular'],
    ['CN10 experiencia vacía', { experiencia: '' }, 'experiencia'],
    ['CN11 tarifa vacía', { tarifaHora: '' }, 'tarifaHora'],
    ['CN12 tarifa 0 (límite inválido)', { tarifaHora: '0' }, 'tarifaHora'],
    ['CN13 tarifa negativa', { tarifaHora: '-5' }, 'tarifaHora'],
    ['CN14 tarifa con texto', { tarifaHora: 'veinte' }, 'tarifaHora'],
  ];
  for (const [nombre, cambios, esperado] of casos) {
    test(nombre, async () => {
      const { servicio } = crearServicio('NINERA');
      assert.equal(await resultado(servicio.actualizarPerfilNinera(10, { ...NINERA_VALIDA, ...cambios })), esperado);
    });
  }
  test('CN03 guarda la zona vacía como null', async () => {
    const { servicio, registro } = crearServicio('NINERA');
    await servicio.actualizarPerfilNinera(10, { ...NINERA_VALIDA, zona: '', descripcion: '' });
    assert.equal(registro.guardado.datosNinera.zona, null);
    assert.equal(registro.guardado.datosNinera.descripcion, null);
  });
});
