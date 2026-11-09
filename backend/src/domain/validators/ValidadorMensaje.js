/**
 * Validador de Dominio: Mensajes (HU17)
 * Reglas de negocio puras, sin dependencias de base de datos ni frameworks.
 */

const MAX_LONGITUD_MENSAJE = 2000;
const MIN_LONGITUD_MENSAJE = 1;

/**
 * Valida los datos requeridos para enviar un mensaje.
 * @param {Object} datos
 * @param {number|string} datos.idEmisor
 * @param {number|string} datos.idReceptor
 * @param {string} datos.contenido
 * @returns {Object} Objeto de errores { [campo]: mensaje }. Vacío si es válido.
 */
function validarEnvioMensaje(datos = {}) {
  const errores = {};
  const { idEmisor, idReceptor, contenido } = datos;

  const emisorNum = Number(idEmisor);
  if (!idEmisor || !Number.isInteger(emisorNum) || emisorNum <= 0) {
    errores.idEmisor = 'El identificador del emisor debe ser un entero positivo válido.';
  }

  const receptorNum = Number(idReceptor);
  if (!idReceptor || !Number.isInteger(receptorNum) || receptorNum <= 0) {
    errores.idReceptor = 'El identificador del receptor debe ser un entero positivo válido.';
  }

  if (emisorNum && receptorNum && emisorNum === receptorNum) {
    errores.idReceptor = 'No es posible enviarse un mensaje a sí mismo.';
  }

  if (contenido === undefined || contenido === null) {
    errores.contenido = 'El contenido del mensaje es obligatorio.';
  } else {
    const textoLimpio = String(contenido).trim();
    if (textoLimpio.length < MIN_LONGITUD_MENSAJE) {
      errores.contenido = 'El mensaje no puede estar vacío.';
    } else if (textoLimpio.length > MAX_LONGITUD_MENSAJE) {
      errores.contenido = `El mensaje no puede exceder los ${MAX_LONGITUD_MENSAJE} caracteres.`;
    }
  }

  return errores;
}

module.exports = {
  MAX_LONGITUD_MENSAJE,
  MIN_LONGITUD_MENSAJE,
  validarEnvioMensaje,
};
