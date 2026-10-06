const {
  REGLAS_FOTO,
  REGLAS_CERTIFICADO,
  validarArchivo,
  validarFechasCertificado,
  validarCertificado,
} = require('../src/domain/validators/ValidadorMultimedia');

const MB = 1024 * 1024;
const HOY = new Date('2026-10-04T15:00:00Z');

const FIRMA_PDF = [0x25, 0x50, 0x44, 0x46];
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function crearArchivo({ mimetype = 'application/pdf', firma = FIRMA_PDF, size } = {}) {
  const buffer = Buffer.alloc(32);
  Buffer.from(firma).copy(buffer);
  return { mimetype, buffer, size: size === undefined ? buffer.length : size, originalname: 'archivo' };
}

/**
 * Prueba de caja blanca: validarArchivo (V(G) = 6).
 * Un caso por cada camino independiente del grafo de flujo.
 */
describe('validarArchivo - caminos independientes (caja blanca)', () => {
  test('C1: sin archivo', () => {
    expect(validarArchivo(undefined, REGLAS_CERTIFICADO)).toBe('Debes adjuntar un archivo.');
  });

  test('C2: formato no permitido', () => {
    const archivo = crearArchivo({ mimetype: 'application/zip' });
    expect(validarArchivo(archivo, REGLAS_CERTIFICADO)).toBe('Formato no permitido.');
  });

  test('C3: archivo vacío', () => {
    const archivo = crearArchivo({ size: 0 });
    expect(validarArchivo(archivo, REGLAS_CERTIFICADO)).toBe('El archivo está vacío.');
  });

  test('C4: supera el tamaño máximo', () => {
    const archivo = crearArchivo({ size: 5 * MB + 1 });
    expect(validarArchivo(archivo, REGLAS_CERTIFICADO)).toBe('El archivo supera el máximo de 5 MB.');
  });

  test('C5: el contenido no coincide con el formato declarado', () => {
    const archivo = crearArchivo({ mimetype: 'application/pdf', firma: FIRMA_PNG });
    expect(validarArchivo(archivo, REGLAS_CERTIFICADO)).toBe(
      'El contenido del archivo no corresponde a su formato.',
    );
  });

  test('C6: archivo válido', () => {
    expect(validarArchivo(crearArchivo(), REGLAS_CERTIFICADO)).toBeNull();
  });

  test('límite exacto de 2 MB para foto es válido', () => {
    const foto = crearArchivo({ mimetype: 'image/png', firma: FIRMA_PNG, size: 2 * MB });
    expect(validarArchivo(foto, REGLAS_FOTO)).toBeNull();
  });
});

describe('validarFechasCertificado', () => {
  test('emisión hoy y sin vencimiento es válido', () => {
    expect(validarFechasCertificado('2026-10-04', '', HOY)).toEqual({});
  });

  test('emisión futura', () => {
    expect(validarFechasCertificado('2026-10-05', '', HOY)).toEqual({
      fechaEmision: 'La fecha de emisión no puede ser futura.',
    });
  });

  test('fecha inexistente (30 de febrero)', () => {
    expect(validarFechasCertificado('2026-02-30', '', HOY).fechaEmision).toMatch(/AAAA-MM-DD/);
  });

  test('vencimiento igual a la emisión', () => {
    expect(validarFechasCertificado('2026-01-10', '2026-01-10', HOY)).toEqual({
      fechaVencimiento: 'El vencimiento debe ser posterior a la emisión.',
    });
  });

  test('certificado vencido', () => {
    expect(validarFechasCertificado('2025-01-10', '2026-10-03', HOY)).toEqual({
      fechaVencimiento: 'El certificado está vencido.',
    });
  });

  test('vence hoy todavía es válido', () => {
    expect(validarFechasCertificado('2025-01-10', '2026-10-04', HOY)).toEqual({});
  });
});

describe('validarCertificado', () => {
  const datosValidos = {
    tipo: 'PRIMEROS_AUXILIOS',
    nombre: 'Curso de Primeros Auxilios Pediátricos',
    institucion: 'Cruz Roja Peruana',
    fechaEmision: '2026-03-15',
    fechaVencimiento: '2028-03-15',
  };

  test('formulario completo y válido', () => {
    expect(validarCertificado(datosValidos, crearArchivo(), HOY)).toEqual({});
  });

  test('reporta todos los campos inválidos a la vez', () => {
    const errores = validarCertificado(
      { tipo: 'MAGIA', nombre: 'ab', institucion: ' ', fechaEmision: '15/03/2026', fechaVencimiento: 'x' },
      undefined,
      HOY,
    );
    expect(Object.keys(errores).sort()).toEqual(
      ['archivo', 'fechaEmision', 'fechaVencimiento', 'institucion', 'nombre', 'tipo'].sort(),
    );
  });
});
