const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Usuarios y Perfiles (HU5)
 * Rutas protegidas mediante authMiddleware (requieren token JWT válido y rol Niñera)
 */
const { autenticar, soloNinera } = container.authMiddleware;

// Consultar datos actuales del perfil de niñera (Figura 6 - Sprint 1)
router.get('/perfil/ninera', autenticar, soloNinera, (req, res) =>
  container.usuarioController.obtenerPerfilNinera(req, res)
);

// Modificar datos del perfil profesional de niñera con restricciones (HU5 / Figura 6)
router.put('/perfil/ninera', autenticar, soloNinera, (req, res) =>
  container.usuarioController.actualizarPerfilNinera(req, res)
);

module.exports = router;
