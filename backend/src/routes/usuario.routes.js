const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Usuarios y Perfiles (HU5 - Perfil Niñera)
 */
const { autenticar, soloNinera } = container.authMiddleware;

// Consultar datos actuales del perfil de niñera (HU5)
router.get('/perfil/ninera', autenticar, soloNinera, (req, res) =>
  container.usuarioController.obtenerPerfilNinera(req, res)
);

// Modificar datos del perfil profesional de niñera (HU5)
router.put('/perfil/ninera', autenticar, soloNinera, (req, res) =>
  container.usuarioController.actualizarPerfilNinera(req, res)
);

module.exports = router;
