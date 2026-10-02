const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Autenticación
 * Delega la petición al controlador de la Arquitectura Hexagonal
 */
router.post('/login', (req, res) => container.authController.login(req, res));

module.exports = router;
