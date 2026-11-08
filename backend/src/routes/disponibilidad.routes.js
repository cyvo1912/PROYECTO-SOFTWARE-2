const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Disponibilidad de Niñeras
 * Permite a las familias autenticadas consultar el calendario interactivo de horarios.
 */
const { autenticar } = container.authMiddleware;

// GET /api/nineras - Listar niñeras activas para selección en el calendario
router.get('/', autenticar, (req, res) =>
  container.disponibilidadController.listarNineras(req, res),
);

// GET /api/nineras/:idNinera/disponibilidad?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/:idNinera/disponibilidad', autenticar, (req, res) =>
  container.disponibilidadController.consultarPorNinera(req, res),
);

module.exports = router;

