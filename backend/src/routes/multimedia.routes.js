const express = require('express');
const router = express.Router();
const container = require('../container');
const subirUnArchivo = require('../infrastructure/http/middlewares/subidaArchivo');

/**
 * Enrutador de Multimedia (HU8)
 * Todas las rutas requieren sesión; la autorización por rol la aplica ServicioMultimedia.
 */
const { autenticar } = container.authMiddleware;

router.get('/', autenticar, (req, res) => container.multimediaController.obtener(req, res));

router.put('/foto', autenticar, subirUnArchivo('foto'), (req, res) =>
  container.multimediaController.actualizarFoto(req, res),
);

router.post('/certificados', autenticar, subirUnArchivo('archivo'), (req, res) =>
  container.multimediaController.subirCertificado(req, res),
);

router.delete('/certificados/:id', autenticar, (req, res) =>
  container.multimediaController.eliminarCertificado(req, res),
);

module.exports = router;
