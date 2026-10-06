const express = require('express');
const router = express.Router();

const container = require('../container');

const { autenticar, soloAdmin } = container.authMiddleware;

/**
 * HU9 - Administración
 *
 * Todas las rutas requieren:
 * 1. JWT válido
 * 2. Rol ADMIN
 */

// Listar niñeras pendientes de verificación
router.get(
  '/nineras/pendientes',
  autenticar,
  soloAdmin,
  (req, res) =>
    container.administradorController.listarNinerasPendientes(
      req,
      res,
    ),
);

// Ver detalle de una niñera
router.get(
  '/nineras/:id',
  autenticar,
  soloAdmin,
  (req, res) =>
    container.administradorController.obtenerNinera(
      req,
      res,
    ),
);

// Aprobar certificado
router.put(
  '/certificados/:id/aprobar',
  autenticar,
  soloAdmin,
  (req, res) =>
    container.administradorController.aprobarCertificado(
      req,
      res,
    ),
);

// Rechazar certificado
router.put(
  '/certificados/:id/rechazar',
  autenticar,
  soloAdmin,
  (req, res) =>
    container.administradorController.rechazarCertificado(
      req,
      res,
    ),
);

// Activar cuenta de niñera
router.put(
  '/nineras/:id/activar',
  autenticar,
  soloAdmin,
  (req, res) =>
    container.administradorController.activarNinera(
      req,
      res,
    ),
);

module.exports = router;