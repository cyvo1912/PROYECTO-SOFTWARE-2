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

app.use('/api', landingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/multimedia', multimediaRoutes);

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
