const express = require('express');
const router = express.Router();

const container = require('../container');
const { autenticar } = container.authMiddleware;

// Registrar una valoración
router.post(
  '/',
  autenticar,
  (req, res) =>
    container.valoracionController.crear(req, res),
);

// Consultar valoración de una reserva
router.get(
  '/reserva/:id',
  autenticar,
  (req, res) =>
    container.valoracionController.obtenerPorReserva(req, res),
);

module.exports = router;
