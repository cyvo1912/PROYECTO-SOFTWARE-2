const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador del Perfil Público de la niñera (HU12)
 * Todas las rutas requieren sesión (token JWT).
 */
const { autenticar, soloNinera } = container.authMiddleware;

// La niñera carga y guarda su formulario de perfil público.
// Van ANTES de "/:idNinera" para que "mio" no se confunda con un id.
router.get('/mio', autenticar, soloNinera, (req, res) =>
  container.perfilPublicoController.obtenerMio(req, res),
);

router.put('/mio', autenticar, soloNinera, (req, res) =>
  container.perfilPublicoController.actualizarMio(req, res),
);

// Cualquier usuario con sesión (la familia) ve el perfil público de una niñera.
router.get('/:idNinera', autenticar, (req, res) =>
  container.perfilPublicoController.ver(req, res),
);

module.exports = router;
