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
const busquedaRoutes = require('./routes/busqueda.routes');

// HU18 - Notificaciones y valoraciones
const notificacionRoutes = require('./routes/notificacion.routes');
const valoracionRoutes = require('./routes/valoracion.routes');

app.use('/api', landingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/multimedia', multimediaRoutes);
app.use('/api/administracion', administradorRoutes);
app.use('/api/hijos', hijoRoutes);
app.use('/api/busqueda', busquedaRoutes);

// HU18
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/valoraciones', valoracionRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Mi Nana API',
    status: 'online',
    version: '1.0.0',
    description: 'Primera version de mi Nana'
  });
});

module.exports = app;
