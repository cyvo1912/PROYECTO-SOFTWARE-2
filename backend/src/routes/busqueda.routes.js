const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Búsqueda (HU11 - Búsqueda de niñeras por proximidad, tarifa y experiencia)
 */
const { autenticar, soloFamilia } = container.authMiddleware;

// Buscar niñeras cercanas a la ubicación de la familia (HU11)
router.get('/ninera', autenticar, soloFamilia, (req, res) =>
  container.busquedaController.buscarNineras(req, res)
);

module.exports = router;
