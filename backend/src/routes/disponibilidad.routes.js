const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Disponibilidad de Niñeras
 * Permite a las familias autenticadas consultar el calendario interactivo de horarios.
 */
const { autenticar, soloFamilia, soloNinera } = container.authMiddleware;

// Gestión de disponibilidad propia, exclusiva para niñeras activas.
router.get('/mia/disponibilidad', autenticar, soloNinera, (req, res) =>
  container.disponibilidadController.consultarMia(req, res),
);
router.post('/mia/disponibilidad', autenticar, soloNinera, (req, res) =>
  container.disponibilidadController.crearMia(req, res),
);
router.patch('/mia/disponibilidad/:idDisponibilidad', autenticar, soloNinera, (req, res) =>
  container.disponibilidadController.actualizarMia(req, res),
);
router.delete('/mia/disponibilidad/:idDisponibilidad', autenticar, soloNinera, (req, res) =>
  container.disponibilidadController.eliminarMia(req, res),
);

// GET /api/nineras - Listar niñeras activas para selección en el calendario
router.get('/', autenticar, soloFamilia, (req, res) =>
  container.disponibilidadController.listarNineras(req, res),
);

// GET /api/nineras/:idNinera/disponibilidad?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/:idNinera/disponibilidad', autenticar, soloFamilia, (req, res) =>
  container.disponibilidadController.consultarPorNinera(req, res),
);

module.exports = router;

