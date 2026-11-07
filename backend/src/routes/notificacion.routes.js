const express = require('express');
const router = express.Router();

const container = require('../container');
const { autenticar } = container.authMiddleware;

// Registrar token Expo del dispositivo
router.post(
  '/token',
  autenticar,
  (req, res) =>
    container.notificacionController.registrarToken(req, res),
);

// Consultar notificaciones del usuario autenticado
router.get(
  '/',
  autenticar,
  (req, res) =>
    container.notificacionController.listar(req, res),
);

// Marcar una notificación como leída
router.patch(
  '/:id/leida',
  autenticar,
  (req, res) =>
    container.notificacionController.marcarComoLeida(req, res),
);

module.exports = router;