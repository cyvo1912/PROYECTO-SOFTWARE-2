const { validarPerfilPublico } = require('../src/domain/validators/ValidadorPerfilPublico');

/**
 * CAJA NEGRA automatizada del formulario de perfil público (HU12).
 * Se prueba solo entrada -> salida (sin mirar el código), con
 * particiones de equivalencia y valores límite de cada uno de los 5 campos.
 */

const VALIDO = {
  biografia: 'a'.repeat(30),
  aniosExperiencia: 5,
  habilidades: ['Cuidado de bebés'],
  idiomas: ['Español'],
  distritos: ['Miraflores'],
};

describe('validarPerfilPublico - formulario completo válido', () => {
  test('CN-01: todos los campos válidos -> sin errores', () => {
    expect(validarPerfilPublico(VALIDO)).toEqual({});
  });
});

describe('validarPerfilPublico - casos por campo', () => {
  test.each([
    // [id, campo, valor, ¿válido?]
    ['CN-02', 'biografia', '', false],                         // vacía
    ['CN-03', 'biografia', 'a'.repeat(29), false],             // límite inferior - 1
    ['CN-04', 'biografia', 'a'.repeat(500), true],             // límite superior
    ['CN-05', 'biografia', 'a'.repeat(501), false],            // límite superior + 1
    ['CN-06', 'aniosExperiencia', '', false],                  // vacío
    ['CN-07', 'aniosExperiencia', 0, true],                    // límite inferior
    ['CN-08', 'aniosExperiencia', -1, false],                  // negativo
    ['CN-09', 'aniosExperiencia', 40, true],                   // límite superior
    ['CN-10', 'aniosExperiencia', 41, false],                  // límite superior + 1
    ['CN-11', 'aniosExperiencia', 2.5, false],                 // decimal
    ['CN-12', 'aniosExperiencia', 'cinco', false],             // texto
    ['CN-13', 'habilidades', [], false],                       // ninguna
    ['CN-14', 'habilidades', ['Cocinar pasteles'], false],     // fuera del catálogo
    ['CN-15', 'habilidades', ['Cuidado de bebés', 'Primeros auxilios', 'Apoyo con tareas',
      'Preparación de comidas', 'Juegos educativos', 'Estimulación temprana', 'Rutinas de sueño'], false], // 7 > máx 6
    ['CN-16', 'idiomas', ['Español', 'Español'], false],       // repetido
    ['CN-17', 'idiomas', ['Quechua', 'Inglés'], true],
    ['CN-18', 'distritos', ['Miraflores', 'San Isidro', 'Barranco', 'Surquillo', 'Lince'], true], // máx 5
    ['CN-19', 'distritos', ['Miraflores', 'San Isidro', 'Barranco', 'Surquillo', 'Lince', 'Breña'], false], // 6
    ['CN-20', 'distritos', 'Miraflores', false],               // no es lista
  ])('%s: %s = %p -> válido: %p', (_id, campo, valor, esValido) => {
    const errores = validarPerfilPublico({ ...VALIDO, [campo]: valor });

    expect(errores[campo] === undefined).toBe(esValido);
  });
});
