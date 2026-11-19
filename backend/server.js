const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Server } = require('socket.io');
const app = require('./src/app');
const container = require('./src/container');

const PORT = process.env.PORT || 5000;

// Crear servidor HTTP y vincular Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Inicializar controladores de WebSockets en el contenedor (DIP)
container.inicializarSockets(io);

// Recarga los tokens revocados (logout) ANTES de aceptar peticiones, para que un token
// cerrado no sea válido ni siquiera en los primeros segundos tras un reinicio.
async function iniciar() {
  try {
    const total = await container.tokenService.cargarRevocados();
    console.log(`Tokens revocados cargados: ${total}`);
  } catch (err) {
    console.warn(
      'Aviso: no se pudieron cargar los tokens revocados (¿falta la migración 010?):',
      err.message,
    );
  }

  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Servidor Mi Nana ejecutandose en el puerto ${PORT}`);
    console.log(`Base URL: http://localhost:${PORT}`);
    console.log(`WebSockets (Socket.IO): habilitado en ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
}

iniciar();

