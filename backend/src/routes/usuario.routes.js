const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Usuarios y Perfiles (HU5 - Perfil Niñera)
 */
const { autenticar, soloNinera, soloFamilia } = container.authMiddleware;

// Consultar datos actuales del perfil de niñera (HU5)
router.get('/perfil/ninera', autenticar, soloNinera, (req, res) =>
  container.usuarioController.obtenerPerfilNinera(req, res)
);

// Modificar datos del perfil profesional de niñera (HU5)
router.put('/perfil/ninera', autenticar, soloNinera, (req, res) =>
  container.usuarioController.actualizarPerfilNinera(req, res)
);

// Consultar datos actuales del perfil de familia
router.get('/perfil/padre', autenticar, soloFamilia, (req, res) =>
  container.usuarioController.obtenerPerfilPadre(req, res)
);

// Modificar datos del perfil de familia / hogar
router.put('/perfil/padre', autenticar, soloFamilia, (req, res) =>
  container.usuarioController.actualizarPerfilPadre(req, res)
);

module.exports = router;
