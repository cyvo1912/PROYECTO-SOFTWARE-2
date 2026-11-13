const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const landingRoutes = require('./routes/landing.routes');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const multimediaRoutes = require('./routes/multimedia.routes');
const administradorRoutes = require('./routes/administrador.routes');
const hijoRoutes = require('./routes/hijo.routes');

// Funcionalidad de búsqueda
const perfilPublicoRoutes = require('./routes/perfilPublico.routes');
const mensajeriaRoutes = require('./routes/mensajeria.routes');
const busquedaRoutes = require('./routes/busqueda.routes');
const disponibilidadRoutes = require('./routes/disponibilidad.routes');
const bolsaTrabajoRoutes = require('./routes/bolsaTrabajo.routes');
const reservaRoutes = require('./routes/reserva.routes');

// HU18 - Notificaciones y valoraciones
const notificacionRoutes = require('./routes/notificacion.routes');
const valoracionRoutes = require('./routes/valoracion.routes');

app.use('/api', landingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/multimedia', multimediaRoutes);
app.use('/api/administracion', administradorRoutes);
app.use('/api/hijos', hijoRoutes);
app.use('/api/perfil-publico', perfilPublicoRoutes);
app.use('/api/mensajeria', mensajeriaRoutes);
app.use('/api/busqueda', busquedaRoutes);
app.use('/api/nineras', disponibilidadRoutes);
app.use('/api/ofertas', bolsaTrabajoRoutes); // HU14
app.use('/api/reservas', reservaRoutes);
app.use('/api/valoraciones', valoracionRoutes);

// HU18
app.use('/api/notificaciones', notificacionRoutes);


// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Mi Nana API',
    status: 'online',
    version: '1.0.0',
    description: 'Primera version de mi Nana'
  });
});

// Manejador 404 para rutas no encontradas en el backend
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `La ruta ${req.method} ${req.originalUrl} no fue encontrada en este servidor.`,
    error: 'NOT_FOUND',
  });
});

module.exports = app;
