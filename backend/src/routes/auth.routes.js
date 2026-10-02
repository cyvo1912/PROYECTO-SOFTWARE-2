const express = require('express');
const router = express.Router();

// Mock de usuarios para la etapa de desarrollo (alineado con la especificación del proyecto)
const USERS_MOCK = {
  'familia@correo.com': {
    id: 1,
    nombre: 'Familia García',
    correo: 'familia@correo.com',
    rol: 'Familia',
    tipoUsuario: 'Padre',
  },
  '20191495@aloe.ulima.edu.pe': {
    id: 2,
    nombre: 'María García',
    correo: '20191495@aloe.ulima.edu.pe',
    rol: 'Ninera',
    tipoUsuario: 'Ninera',
  },
  'admin@minana.pe': {
    id: 3,
    nombre: 'Administrador Sistema',
    correo: 'admin@minana.pe',
    rol: 'Admin',
    tipoUsuario: 'Admin',
  },
};

/**
 * POST /api/auth/login
 * Basado en: Figura 5 - Diagrama de Secuencia Inicio Sesión - Sprint 1
 * (PantallaLogin -> ServicioAuth -> BD)
 */
router.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  // Validación básica de campos requeridos
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Credenciales incompletas',
      message: 'Por favor ingresa tu correo y contraseña.',
    });
  }

  // Validación de formato de email básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Formato inválido',
      message: 'Ingresa un formato de correo electrónico válido.',
    });
  }

  // Simulación ServicioAuth (según la leyenda del Mockup: "Demo: usa cualquier correo y contraseña para probar")
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = USERS_MOCK[normalizedEmail];

  const userRole = role || (existingUser ? existingUser.rol : 'Familia');
  const userName = existingUser ? existingUser.nombre : normalizedEmail.split('@')[0];

  // Simulación de token JWT (Sprint 1 HU1 T2: "Implementar lógica de autenticación y tokens JWT")
  const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_minana_${Date.now()}`;

  return res.json({
    success: true,
    message: 'Inicio de sesión exitoso',
    token: mockToken,
    user: {
      id: existingUser ? existingUser.id : Math.floor(Math.random() * 1000) + 10,
      nombre: userName,
      correo: normalizedEmail,
      rol: userRole,
    },
  });
});

module.exports = router;
