const express = require('express');
const router = express.Router();
const container = require('../container');

const { autenticar } = container.authMiddleware;

router.get('/', autenticar, (req, res) => container.reservaController.listar(req, res));
router.patch('/:id/estado', autenticar, (req, res) =>
  container.reservaController.actualizarEstado(req, res),
);

module.exports = router;
