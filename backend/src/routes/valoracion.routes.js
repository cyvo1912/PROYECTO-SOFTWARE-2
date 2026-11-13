const express = require('express');
const container = require('../container');

const router = express.Router();
router.post('/', container.authMiddleware.autenticar, container.authMiddleware.soloFamilia, (req, res) => container.valoracionController.crear(req, res));
router.get('/ninera/:idNinera', container.authMiddleware.autenticar, (req, res) => container.valoracionController.listarPorNinera(req, res));

module.exports = router;
