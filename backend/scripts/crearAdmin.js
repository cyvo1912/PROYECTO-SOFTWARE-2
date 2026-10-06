const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString:
    process.env.DB ||
    process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const ADMIN = {
  nombre: 'Administrador',
  apellido: 'Sistema',
  correo: 'admin@minana.com',
  dni: '99999999',
  celular: '999999999',
  contrasena: 'Admin123!',
};

async function crearAdmin() {
  try {
    const hash = await bcrypt.hash(
      ADMIN.contrasena,
      10,
    );

    const existente = await pool.query(
      `
      SELECT id_usuario
      FROM usuario
      WHERE correo = $1
      LIMIT 1;
      `,
      [ADMIN.correo],
    );

    if (existente.rows.length > 0) {
      await pool.query(
        `
        UPDATE usuario
        SET
          nombre_usuario = $1,
          apellido_usuario = $2,
          dni = $3,
          celular = $4,
          contrasena_hash = $5,
          tipo_usuario = 'ADMIN',
          estado_cuenta = 'ACTIVA'
        WHERE correo = $6;
        `,
        [
          ADMIN.nombre,
          ADMIN.apellido,
          ADMIN.dni,
          ADMIN.celular,
          hash,
          ADMIN.correo,
        ],
      );

      console.log('Administrador actualizado.');
    } else {
      await pool.query(
        `
        INSERT INTO usuario
        (
          nombre_usuario,
          apellido_usuario,
          correo,
          dni,
          contrasena_hash,
          celular,
          tipo_usuario,
          estado_cuenta
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, 'ADMIN', 'ACTIVA');
        `,
        [
          ADMIN.nombre,
          ADMIN.apellido,
          ADMIN.correo,
          ADMIN.dni,
          hash,
          ADMIN.celular,
        ],
      );

      console.log('Administrador creado.');
    }

    console.log('');
    console.log('================================');
    console.log('CUENTA ADMIN');
    console.log('Correo: admin@minana.com');
    console.log('Contraseña: Admin123!');
    console.log('================================');
  } catch (error) {
    console.error(
      'Error creando administrador:',
      error.message,
    );
  } finally {
    await pool.end();
  }
}

crearAdmin();