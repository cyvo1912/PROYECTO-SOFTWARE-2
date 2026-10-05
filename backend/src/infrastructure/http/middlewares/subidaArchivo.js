const multer = require('multer');

/**
 * Middleware de subida de un solo archivo en memoria (HU8).
 * El límite de multer es un tope de seguridad; los límites por tipo de archivo
 * los aplica ValidadorMultimedia con mensajes para el usuario.
 */
const LIMITE_BYTES = 6 * 1024 * 1024;

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITE_BYTES, files: 1 },
});

function subirUnArchivo(campo) {
  const procesar = subida.single(campo);
  return (req, res, next) =>
    procesar(req, res, (error) => {
      if (!error) return next();
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo supera el tamaño máximo permitido.'
          : 'No se pudo procesar el archivo enviado.';
      return res.status(400).json({ success: false, message, fields: { [campo]: message } });
    });
}

module.exports = subirUnArchivo;
