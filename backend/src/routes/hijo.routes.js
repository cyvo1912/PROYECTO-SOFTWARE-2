const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Perfiles de Hijos
 * Rutas protegidas mediante authMiddleware (requieren token JWT válido y rol Familia)
 */
const { autenticar, soloFamilia } = container.authMiddleware;

// Listar los hijos de la familia autenticada
router.get('/', autenticar, soloFamilia, (req, res) =>
  container.hijoController.listar(req, res)
);

// Registrar el perfil de un hijo
router.post('/', autenticar, soloFamilia, (req, res) =>
  container.hijoController.registrar(req, res)
);

// Editar el perfil de un hijo (solo si pertenece a la familia autenticada)
router.put('/:id', autenticar, soloFamilia, (req, res) =>
  container.hijoController.actualizar(req, res)
);

module.exports = router;
