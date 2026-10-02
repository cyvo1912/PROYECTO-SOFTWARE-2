const express = require('express');
const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/landing/stats
router.get('/landing/stats', (req, res) => {
  res.json({
    nanniesCount: 450,
    familiesCount: 1200,
    completedServices: 3800,
    averageRating: 4.9,
    coverage: 'Lima Metropolitana'
  });
});

// GET /api/landing/features
router.get('/landing/features', (req, res) => {
  res.json({
    features: [
      {
        id: 1,
        icon: 'shield-checkmark',
        title: 'Niñeras 100% Verificadas',
        description: 'Validamos identidad, antecedentes penales y policiales, y referencias laborales previas de cada cuidadora.'
      },
      {
        id: 2,
        icon: 'calendar',
        title: 'Horarios a tu Medida',
        description: 'Reserva cuidados por horas, medio tiempo, turnos nocturnos, fines de semana o emergencias de último minuto.'
      },
      {
        id: 3,
        icon: 'card',
        title: 'Tarifas Claras y Sin Sorpresas',
        description: 'Conoce la tarifa por hora desde el primer momento. Sin costos ocultos ni intermediaciones opacas.'
      },
      {
        id: 4,
        icon: 'star',
        title: 'Valoraciones Transparentes',
        description: 'Opiniones y calificaciones reales de otras familias que ya contrataron el servicio.'
      }
    ]
  });
});

// POST /api/landing/contact (interés inicial o newsletter)
router.post('/landing/contact', (req, res) => {
  const { name, email, role, message } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Nombre y correo electrónico son requeridos' });
  }

  // En esta fase sin BD, respondemos con confirmación exitosa
  return res.json({
    success: true,
    message: `¡Gracias por tu interés en Mi Nana, ${name}! Te contactaremos pronto a ${email}.`,
    data: { name, email, role }
  });
});

module.exports = router;
