/**
 * Validador de Dominio: perfil público de la niñera (HU12)
 * Reglas puras (sin base de datos ni Express) para poder probarlas de forma aislada.
 *
 * Campos del formulario (caja negra):
 *   1. biografia          texto de 30 a 500 caracteres
 *   2. aniosExperiencia   número entero de 0 a 60
 *   3. habilidades        de 1 a 6 opciones del catálogo
 *   4. idiomas            de 1 a 4 opciones del catálogo
 *   5. distritos          de 1 a 5 opciones del catálogo
 */

const OPCIONES = {
  habilidades: [
    'Cuidado de bebés',
    'Primeros auxilios',
    'Apoyo con tareas',
    'Preparación de comidas',
    'Juegos educativos',
    'Estimulación temprana',
    'Rutinas de sueño',
    'Niños con necesidades especiales',
  ],
  idiomas: ['Español', 'Inglés', 'Quechua', 'Portugués', 'Francés'],
  distritos: [
    'Barranco',
    'Breña',
    'Callao',
    'Chorrillos',
    'Jesús María',
    'La Molina',
    'Lince',
    'Lima Cercado',
    'Los Olivos',
    'Magdalena del Mar',
    'Miraflores',
    'Pueblo Libre',
    'San Borja',
    'San Isidro',
    'San Juan de Lurigancho',
    'San Miguel',
    'Santiago de Surco',
    'Surquillo',
  ],
};

const LIMITES = {
  biografia: { min: 30, max: 500 },
  aniosExperiencia: { min: 0, max: 60 }, // mismo rango que la HU11 (búsqueda)
  habilidades: { min: 1, max: 6 },
  idiomas: { min: 1, max: 4 },
  distritos: { min: 1, max: 5 },
};

function validarBiografia(biografia) {
  const { min, max } = LIMITES.biografia;
  if (typeof biografia !== 'string' || !biografia.trim()) {
    return 'La biografía es obligatoria.';
  }
  const largo = biografia.trim().length;
  if (largo < min || largo > max) {
    return `La biografía debe tener entre ${min} y ${max} caracteres.`;
  }
  return null;
}

function validarAnios(anios) {
  const { min, max } = LIMITES.aniosExperiencia;
  if (anios === undefined || anios === null || anios === '') {
    return 'Los años de experiencia son obligatorios.';
  }
  const numero = Number(anios);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    return `Los años de experiencia deben ser un número entero entre ${min} y ${max}.`;
  }
  return null;
}

/** Sirve para habilidades, idiomas y distritos: todas son listas con opciones fijas. */
function validarLista(campo, lista, nombreVisible) {
  const { min, max } = LIMITES[campo];
  if (!Array.isArray(lista) || lista.length < min) {
    return `Selecciona al menos ${min} opción en ${nombreVisible}.`;
  }
  if (lista.length > max) {
    return `Puedes seleccionar como máximo ${max} opciones en ${nombreVisible}.`;
  }
  const invalida = lista.find((opcion) => !OPCIONES[campo].includes(opcion));
  if (invalida !== undefined) {
    return `"${invalida}" no es una opción válida en ${nombreVisible}.`;
  }
  if (new Set(lista).size !== lista.length) {
    return `Hay opciones repetidas en ${nombreVisible}.`;
  }
  return null;
}

/**
 * Revisa todos los campos y devuelve un objeto { campo: mensaje }.
 * Si el objeto está vacío, el formulario es válido.
 */
function validarPerfilPublico(datos = {}) {
  const errores = {};
  const resultados = {
    biografia: validarBiografia(datos.biografia),
    aniosExperiencia: validarAnios(datos.aniosExperiencia),
    habilidades: validarLista('habilidades', datos.habilidades, 'habilidades'),
    idiomas: validarLista('idiomas', datos.idiomas, 'idiomas'),
    distritos: validarLista('distritos', datos.distritos, 'distritos'),
  };
  for (const [campo, mensaje] of Object.entries(resultados)) {
    if (mensaje) errores[campo] = mensaje;
  }
  return errores;
}

module.exports = { OPCIONES, LIMITES, validarPerfilPublico };
