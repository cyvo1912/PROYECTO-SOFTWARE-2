const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Reservas (solo familias autenticadas).
 */
const { autenticar, soloFamilia } = container.authMiddleware;

// POST /api/reservas/cotizar - Calcula el monto sin guardar
router.post('/cotizar', autenticar, soloFamilia, (req, res) =>
  container.reservaController.cotizar(req, res),
);

// POST /api/reservas - Solicita una reserva (queda "Pendiente")
router.post('/', autenticar, soloFamilia, (req, res) =>
  container.reservaController.solicitar(req, res),
);

// GET /api/reservas - Reservas de la familia autenticada
router.get('/', autenticar, (req, res) =>
  container.reservaController.listarMias(req, res),
);

router.patch('/:id/estado', autenticar, (req, res) =>
  container.reservaController.cambiarEstado(req, res),
);

module.exports = router;
