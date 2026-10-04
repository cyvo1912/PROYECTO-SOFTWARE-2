const path = require('path');
const { Pool } = require('pg');
// Cargar .env desde backend/.env o desde la raíz del proyecto
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const connectionString = process.env.DB || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB] ADVERTENCIA: La variable de entorno DB no está definida en .env.');
}

const isLocalhost = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = pool;
