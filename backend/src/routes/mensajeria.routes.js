const express = require('express');
const router = express.Router();
const container = require('../container');

/**
 * Enrutador de Mensajería Interna (HU17)
 * Rutas protegidas mediante authMiddleware (requieren token JWT válido).
 */
const { autenticar } = container.authMiddleware;

// Listar conversaciones activas con último mensaje y badge de no leídos
router.get('/conversaciones', autenticar, (req, res) =>
  container.mensajeriaController.listarConversaciones(req, res)
);

// Obtener historial de mensajes con un contacto específico
router.get('/conversacion/:idContacto', autenticar, (req, res) =>
  container.mensajeriaController.obtenerHistorial(req, res)
);

// Enviar un mensaje (REST fallback)
router.post('/enviar', autenticar, (req, res) =>
  container.mensajeriaController.enviarMensaje(req, res)
);

// Marcar mensajes de un contacto como leídos
router.put('/leer/:idContacto', autenticar, (req, res) =>
  container.mensajeriaController.marcarComoLeido(req, res)
);

// Obtener perfil detallado de un contacto (botón Ver Perfil en chat)
router.get('/contacto/:idContacto', autenticar, (req, res) =>
  container.mensajeriaController.obtenerPerfilContacto(req, res)
);

module.exports = router;
