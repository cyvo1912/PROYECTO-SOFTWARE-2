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
    calificacion_promedio NUMERIC(3, 2) DEFAULT 5.0,
    -- HU12: perfil público ampliado (ver migrations/004_hu12_perfil_publico.sql)
    habilidades TEXT[] NOT NULL DEFAULT '{}',
    idiomas TEXT[] NOT NULL DEFAULT '{}',
    distritos TEXT[] NOT NULL DEFAULT '{}',
    -- HU11: coordenadas para búsqueda por proximidad (Google Maps API) y
    -- años de experiencia en formato numérico para poder filtrar por ellos.
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    anos_experiencia SMALLINT -- también lo usa el perfil público (HU12)
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
    comentario TEXT,
    -- HU Reservas: cálculo de tarifa (ver migrations/005_hu_reservas.sql)
    tarifa_hora NUMERIC(10, 2),
    horas NUMERIC(5, 2),
    monto_total NUMERIC(10, 2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMPTZ, -- fin de los 10 min para pagar una reserva "Pendiente"
    CONSTRAINT chk_reserva_horario_valido CHECK (hora_fin > hora_inicio)
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

-- HU14: Bolsa de Trabajo (ver migrations/005_hu14_bolsa_trabajo.sql)
-- Ofertas de trabajo publicadas por familias
CREATE TABLE IF NOT EXISTS oferta_trabajo (
    id_oferta SERIAL PRIMARY KEY,
    id_padre INT NOT NULL REFERENCES padre(id_padre) ON DELETE CASCADE,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    distrito VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    tarifa_hora NUMERIC(10, 2) NOT NULL CHECK (tarifa_hora > 0),
    numero_ninos INT NOT NULL DEFAULT 1 CHECK (numero_ninos > 0),
    edades_ninos VARCHAR(100),
    requisitos TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oferta_trabajo_estado_fecha ON oferta_trabajo (estado, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_oferta_trabajo_padre ON oferta_trabajo (id_padre);

-- Postulaciones de niñeras a las ofertas de trabajo
CREATE TABLE IF NOT EXISTS postulacion (
    id_postulacion SERIAL PRIMARY KEY,
    id_oferta INT NOT NULL REFERENCES oferta_trabajo(id_oferta) ON DELETE CASCADE,
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    mensaje TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
    fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_oferta, id_ninera)
);

CREATE INDEX IF NOT EXISTS idx_postulacion_ninera ON postulacion (id_ninera);
