-- ==========================================================
-- PROYECTO: Mi Nana (Ingeniería de Software)
-- Base de Datos: BD_NannyApp (PostgreSQL en Neon)
-- Esquema oficial sincronizado con los adaptadores del Backend
-- ==========================================================

-- Tabla de Usuarios generales (Familias, Niñeras, Administradores)
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL,
    apellido_usuario VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    celular VARCHAR(20),
    tipo_usuario VARCHAR(30) NOT NULL CHECK (tipo_usuario IN ('FAMILIA', 'NINERA', 'ADMIN')),
    estado_cuenta VARCHAR(30) DEFAULT 'ACTIVA',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Perfil específico de Padre / Familia
CREATE TABLE IF NOT EXISTS padre (
    id_padre INT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    nombre_familia VARCHAR(150),
    direccion VARCHAR(255),
    numero_ninos INT DEFAULT 0,
    edades_ninos VARCHAR(100),
    informacion_adicional TEXT
);

-- Perfil específico de Niñera
CREATE TABLE IF NOT EXISTS ninera (
    id_ninera INT PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    zona VARCHAR(100),
    experiencia TEXT,
    tarifa_hora NUMERIC(10, 2) NOT NULL,
    descripcion TEXT,
    verificada BOOLEAN DEFAULT FALSE,
    calificacion_promedio NUMERIC(3, 2) DEFAULT 5.0
);

-- Tabla de Hijos asociados a una Familia
CREATE TABLE IF NOT EXISTS hijo (
    id_hijo SERIAL PRIMARY KEY,
    id_padre INT NOT NULL REFERENCES padre(id_padre) ON DELETE CASCADE,
    nombre_hijo VARCHAR(100) NOT NULL,
    edad INT NOT NULL,
    alergias TEXT,
    condiciones_medicas TEXT,
    notas TEXT
);

-- Disponibilidad de las Niñeras
CREATE TABLE IF NOT EXISTS disponibilidad (
    id_disponibilidad SERIAL PRIMARY KEY,
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    fecha DATE,
    dia_semana VARCHAR(20),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(30) DEFAULT 'Disponible'
);

-- Reservas de cuidado infantil
CREATE TABLE IF NOT EXISTS reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_padre INT NOT NULL REFERENCES padre(id_padre),
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera),
    id_hijo INT REFERENCES hijo(id_hijo),
    fecha_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    estado_reserva VARCHAR(30) DEFAULT 'Pendiente',
    comentario TEXT
);

-- Valoraciones y reseñas
CREATE TABLE IF NOT EXISTS valoracion (
    id_valoracion SERIAL PRIMARY KEY,
    id_reserva INT UNIQUE REFERENCES reserva(id_reserva),
    id_padre INT NOT NULL REFERENCES padre(id_padre),
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera),
    calificacion INT CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    fecha_valoracion DATE DEFAULT CURRENT_DATE
);

-- Niñeras Favoritas marcadas por Padres
CREATE TABLE IF NOT EXISTS favorito (
    id_favorito SERIAL PRIMARY KEY,
    id_padre INT NOT NULL REFERENCES padre(id_padre) ON DELETE CASCADE,
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    fecha_agregado DATE DEFAULT CURRENT_DATE,
    UNIQUE(id_padre, id_ninera)
);

-- Mensajería interna entre usuarios
CREATE TABLE IF NOT EXISTS mensaje (
    id_mensaje SERIAL PRIMARY KEY,
    id_usuario_emisor INT NOT NULL REFERENCES usuario(id_usuario),
    id_usuario_receptor INT NOT NULL REFERENCES usuario(id_usuario),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    asunto VARCHAR(150),
    contenido TEXT NOT NULL
);
