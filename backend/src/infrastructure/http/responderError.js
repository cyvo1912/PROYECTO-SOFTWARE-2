/**
 * Respuesta HTTP única para errores de dominio (principio DRY).
 * Los controladores Auth y Usuario tienen hoy su propia copia de esta lógica;
 * pueden reemplazarla por esta función.
 */
function responderError(res, error) {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    isPending: error.isPending || undefined,
    message: statusCode === 500 ? 'Error interno del servidor.' : error.message,
    fields: error.fields || undefined,
  });
}

module.exports = responderError;
