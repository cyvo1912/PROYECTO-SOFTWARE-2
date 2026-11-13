
/**
 * Respuesta HTTP centralizada para errores de dominio.
 */
function responderError(res, error) {
  const estadosPorNombre = {
    ValidationError: 400,
    NotFoundError: 404,
    ForbiddenError: 403,
    UnauthorizedError: 401,
    ConflictError: 409,
  };

  const estadoDeclarado = Number(
    error?.statusCode ?? error?.status
  );

  const statusCode =
    Number.isInteger(estadoDeclarado) &&
    estadoDeclarado >= 400 &&
    estadoDeclarado <= 599
      ? estadoDeclarado
      : estadosPorNombre[error?.name] || 500;

  if (statusCode >= 500) {
    console.error('=== ERROR INTERNO HTTP ===', {
      nombre: error?.name,
      mensaje: error?.message,
      stack: error?.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    ...(error?.isPending !== undefined
      ? { isPending: error.isPending }
      : {}),
    message:
      statusCode >= 500
        ? 'Error interno del servidor.'
        : error?.message || 'Error en la solicitud.',
    ...(error?.fields !== undefined
      ? { fields: error.fields }
      : {}),
  });
}

module.exports = responderError;
