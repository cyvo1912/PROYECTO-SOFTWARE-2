const ServicioRegistro = require('../src/application/services/ServicioRegistro');

/**
 * Prueba de caja blanca de ServicioRegistro._validarIdentidad (HU2 y HU3).
 * V(G) = 11: un caso por cada camino independiente del grafo de flujo.
 * Cada caso parte de datos válidos y cambia un solo campo.
 */

function crearServicio() {
  return new ServicioRegistro({
    userRepository: {},
    passwordHasher: {},
    tokenService: {},
  });
}

const VALIDOS = {
  nombre: 'Juana',
  apellido: 'Pérez',
  correo: 'juana.perez@gmail.com',
  dni: '71234567',
  celular: '987654321',
  contrasena: 'clave1234',
};

function validar(cambios) {
  const errores = {};
  crearServicio()._validarIdentidad({ ...VALIDOS, ...cambios }, errores);
  return errores;
}

describe('ServicioRegistro._validarIdentidad - caminos independientes (V(G) = 11)', () => {
  test('C1: nombre vacío', () => {
    expect(validar({ nombre: '' })).toEqual({ nombre: 'El nombre es obligatorio.' });
  });

  test('C2: apellido con solo espacios', () => {
    expect(validar({ apellido: ' ' })).toEqual({ apellido: 'El apellido es obligatorio.' });
  });

  test('C3: correo vacío', () => {
    expect(validar({ correo: '' })).toEqual({ correo: 'El correo es obligatorio.' });
  });

  test('C4: correo sin @', () => {
    expect(validar({ correo: 'juana.perez-gmail.com' })).toEqual({ correo: 'El correo no tiene un formato válido.' });
  });

  test('C5: DNI vacío', () => {
    expect(validar({ dni: '' })).toEqual({ dni: 'El DNI es obligatorio.' });
  });

  test('C6: DNI con menos de 8 dígitos', () => {
    expect(validar({ dni: '712345' })).toEqual({ dni: 'El DNI debe tener 8 dígitos.' });
  });

  test('C7: celular vacío', () => {
    expect(validar({ celular: '' })).toEqual({ celular: 'El teléfono es obligatorio.' });
  });

  test('C8: celular con formato inválido', () => {
    expect(validar({ celular: '12-34' })).toEqual({ celular: 'El teléfono no es válido.' });
  });

  test('C9: contraseña vacía', () => {
    expect(validar({ contrasena: '' })).toEqual({ contrasena: 'La contraseña es obligatoria.' });
  });

  test('C10: contraseña de menos de 8 caracteres', () => {
    expect(validar({ contrasena: 'abc123' })).toEqual({ contrasena: 'La contraseña debe tener al menos 8 caracteres.' });
  });

  test('C11: todos los campos válidos', () => {
    expect(validar({})).toEqual({});
  });
});
