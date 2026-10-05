/**
 * Validador de Dominio: archivos y certificados (HU8)
 * Reglas puras, sin dependencias de infraestructura, para poder probarlas de forma aislada.
 */

const MB = 1024 * 1024;

const TIPOS_CERTIFICADO = [
  'PRIMEROS_AUXILIOS',
  'RCP',
  'EDUCACION_INICIAL',
  'CUIDADO_INFANTIL',
  'ANTECEDENTES_POLICIALES',
  'ANTECEDENTES_PENALES',
  'OTRO',
];

const REGLAS_FOTO = {
  tiposPermitidos: ['image/jpeg', 'image/png', 'image/webp'],
  tamanoMaximoBytes: 2 * MB,
};

const REGLAS_CERTIFICADO = {
  tiposPermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
  tamanoMaximoBytes: 5 * MB,
};

/** Máximo de certificados que puede tener una niñera. */
const MAX_CERTIFICADOS = 10;

/**
 * Firmas binarias ("magic numbers") de cada formato. El mimetype lo declara el cliente
 * y puede falsificarse; los primeros bytes del archivo no.
 */
const FIRMAS = {
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
  ],
};

const FECHA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function tieneFirmaValida(buffer, mimetype) {
  const firmas = FIRMAS[mimetype];
  if (!buffer || !firmas) return false;
  return firmas.every(({ offset, bytes }) =>
    bytes.every((byte, i) => buffer[offset + i] === byte),
  );
}

/**
 * Valida un archivo subido (objeto de multer: { mimetype, size, buffer }).
 * Retorna null si es válido o el mensaje de error.
 *
 * Complejidad ciclomática = 6 (5 decisiones + 1). Método elegido para la prueba de caja blanca.
 */
function validarArchivo(archivo, reglas) {
  if (!archivo) {
    return 'Debes adjuntar un archivo.';
  }
  if (!reglas.tiposPermitidos.includes(archivo.mimetype)) {
    return 'Formato no permitido.';
  }
  if (archivo.size <= 0) {
    return 'El archivo está vacío.';
  }
  if (archivo.size > reglas.tamanoMaximoBytes) {
    return `El archivo supera el máximo de ${reglas.tamanoMaximoBytes / MB} MB.`;
  }
  if (!tieneFirmaValida(archivo.buffer, archivo.mimetype)) {
    return 'El contenido del archivo no corresponde a su formato.';
  }
  return null;
}

/**
 * Convierte 'AAAA-MM-DD' en una fecha UTC. Retorna null si el formato o la fecha no existen
 * (por ejemplo 2026-02-30).
 */
function parsearFecha(texto) {
  if (typeof texto !== 'string') return null;
  const partes = FECHA_REGEX.exec(texto.trim());
  if (!partes) return null;
  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return fecha;
}

function soloFecha(fecha) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

/**
 * Reglas de fechas: la emisión es obligatoria y no futura; el vencimiento es opcional,
 * pero si existe debe ser posterior a la emisión y no estar vencido.
 */
function validarFechasCertificado(fechaEmision, fechaVencimiento, hoy) {
  const errores = {};
  const hoySinHora = soloFecha(hoy);
  const emision = parsearFecha(fechaEmision);

  if (!emision) {
    errores.fechaEmision = 'Ingresa la fecha de emisión con formato AAAA-MM-DD.';
  } else if (emision > hoySinHora) {
    errores.fechaEmision = 'La fecha de emisión no puede ser futura.';
  }

  if (fechaVencimiento) {
    const vencimiento = parsearFecha(fechaVencimiento);
    if (!vencimiento) {
      errores.fechaVencimiento = 'Ingresa la fecha de vencimiento con formato AAAA-MM-DD.';
    } else if (emision && vencimiento <= emision) {
      errores.fechaVencimiento = 'El vencimiento debe ser posterior a la emisión.';
    } else if (vencimiento < hoySinHora) {
      errores.fechaVencimiento = 'El certificado está vencido.';
    }
  }

  return errores;
}

function validarTexto(valor, minimo, maximo) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  return texto.length >= minimo && texto.length <= maximo;
}

/**
 * Valida el formulario completo de certificado (6 campos de entrada).
 * Retorna un objeto { campo: mensaje }; vacío si todo es válido.
 */
function validarCertificado(datos, archivo, hoy) {
  const errores = {};

  if (!TIPOS_CERTIFICADO.includes(datos.tipo)) {
    errores.tipo = 'Selecciona un tipo de certificado válido.';
  }
  if (!validarTexto(datos.nombre, 3, 100)) {
    errores.nombre = 'El nombre debe tener entre 3 y 100 caracteres.';
  }
  if (!validarTexto(datos.institucion, 2, 100)) {
    errores.institucion = 'La institución debe tener entre 2 y 100 caracteres.';
  }

  Object.assign(errores, validarFechasCertificado(datos.fechaEmision, datos.fechaVencimiento, hoy));

  const errorArchivo = validarArchivo(archivo, REGLAS_CERTIFICADO);
  if (errorArchivo) {
    errores.archivo = errorArchivo;
  }

  return errores;
}

module.exports = {
  TIPOS_CERTIFICADO,
  REGLAS_FOTO,
  REGLAS_CERTIFICADO,
  MAX_CERTIFICADOS,
  validarArchivo,
  validarFechasCertificado,
  validarCertificado,
  parsearFecha,
};
