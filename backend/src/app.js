const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const landingRoutes = require('./routes/landing.routes');
app.use('/api', landingRoutes);

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
