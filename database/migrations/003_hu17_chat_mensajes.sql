-- ==========================================================
-- Migración 003 - HU17: Mensajería en Tiempo Real y Chat
-- Responsable: Gabriel (HU17)
-- ==========================================================

-- Tabla de reservas de cuidado infantil (requerida para validar la regla de tarifa pagada)
CREATE TABLE IF NOT EXISTS reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_padre INT NOT NULL REFERENCES padre(id_padre) ON DELETE CASCADE,
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    id_hijo INT REFERENCES hijo(id_hijo) ON DELETE SET NULL,
    fecha_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    estado_reserva VARCHAR(30) DEFAULT 'Pendiente',
    comentario TEXT
);

-- Mensajería interna entre usuarios
CREATE TABLE IF NOT EXISTS mensaje (
    id_mensaje SERIAL PRIMARY KEY,
    id_usuario_emisor INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_usuario_receptor INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    fecha_creacion TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Lima'),
    asunto VARCHAR(150),
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP NULL
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE mensaje
ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_lectura TIMESTAMP NULL;

-- Tabla de notificaciones requerida por el diagrama de secuencia (Figura 56)
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo_notificacion VARCHAR(50) DEFAULT 'Mensaje',
    titulo VARCHAR(150),
    mensaje TEXT,
    fecha_envio TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Lima'),
    leido BOOLEAN DEFAULT FALSE
);

-- Índices para optimizar consultas de chat y mensajes no leídos
CREATE INDEX IF NOT EXISTS idx_mensaje_conversacion 
ON mensaje (id_usuario_emisor, id_usuario_receptor, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_mensaje_no_leidos 
ON mensaje (id_usuario_receptor, leido);

CREATE INDEX IF NOT EXISTS idx_notificacion_usuario_leido
ON notificacion (id_usuario, leido);

CREATE INDEX IF NOT EXISTS idx_reserva_padre_ninera_estado
ON reserva (id_padre, id_ninera, estado_reserva);
