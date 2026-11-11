const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de la Bolsa de Trabajo (HU14)
 * - Niñera: explora ofertas, ve su detalle y se postula.
 * - Familia: publica ofertas y consulta las suyas.
 */
const { autenticar, soloNinera, soloFamilia } = container.authMiddleware;

// Rutas fijas antes de /:id para que no se confundan con un identificador
router.get('/mis-postulaciones', autenticar, soloNinera, (req, res) =>
  container.bolsaTrabajoController.misPostulaciones(req, res),
);

router.get('/mis-ofertas', autenticar, soloFamilia, (req, res) =>
  container.bolsaTrabajoController.misOfertas(req, res),
);

// GET /api/ofertas?q=&distrito=&tarifaMin=&soloCompatibles=true
router.get('/', autenticar, soloNinera, (req, res) =>
  container.bolsaTrabajoController.explorar(req, res),
);

// POST /api/ofertas - La familia publica una oferta
router.post('/', autenticar, soloFamilia, (req, res) =>
  container.bolsaTrabajoController.publicar(req, res),
);

router.get('/:id', autenticar, soloNinera, (req, res) =>
  container.bolsaTrabajoController.obtener(req, res),
);

// POST /api/ofertas/:id/postulaciones - La niñera se postula
router.post('/:id/postulaciones', autenticar, soloNinera, (req, res) =>
  container.bolsaTrabajoController.postular(req, res),
);

module.exports = router;
