const path = require('path');
// Cargar .env desde backend/.env o desde la raíz del proyecto
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const connectionString = process.env.DB || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB] ADVERTENCIA: La variable de entorno DB no está definida en .env.');
}

const isLocalhost = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const isNeon = Boolean(connectionString && connectionString.includes('neon.tech'));

let pool;
if (isNeon) {
  // Para bases de datos en Neon.tech (funciona a través de firewalls y redes universitarias en puerto 443)
  const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
} else {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = pool;
