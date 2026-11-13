-- ==========================================================
-- Migración 006 - HU18: Notificaciones Push y Valoraciones
-- Responsable: HU18
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. TABLA DE VALORACIONES
-- ==========================================================

-- Permite que las familias califiquen los servicios recibidos
-- Cada reserva solamente puede tener una valoración

CREATE TABLE IF NOT EXISTS valoracion (
    id_valoracion SERIAL PRIMARY KEY,

    id_reserva INT NOT NULL UNIQUE
        REFERENCES reserva(id_reserva) ON DELETE CASCADE,

    id_padre INT NOT NULL
        REFERENCES padre(id_padre) ON DELETE CASCADE,

    id_ninera INT NOT NULL
        REFERENCES ninera(id_ninera) ON DELETE CASCADE,

    calificacion INT NOT NULL
        CHECK (calificacion BETWEEN 1 AND 5),

    comentario TEXT,

    fecha_creacion TIMESTAMP
        DEFAULT (NOW() AT TIME ZONE 'America/Lima')
);


-- ==========================================================
-- 2. ASEGURAR COLUMNAS DE VALORACIONES
-- ==========================================================

ALTER TABLE valoracion
ADD COLUMN IF NOT EXISTS comentario TEXT,
ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP
    DEFAULT (NOW() AT TIME ZONE 'America/Lima');


-- ==========================================================
-- 3. CALIFICACIÓN PROMEDIO DE LAS NIÑERAS
-- ==========================================================

-- Almacena el promedio de las valoraciones recibidas

ALTER TABLE ninera
ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC(3,2);


-- Actualizar promedios de valoraciones existentes

UPDATE ninera n
SET calificacion_promedio = (
    SELECT ROUND(AVG(v.calificacion)::numeric, 2)
    FROM valoracion v
    WHERE v.id_ninera = n.id_ninera
);


-- ==========================================================
-- 4. NOTIFICACIONES
-- ==========================================================

-- La tabla notificacion fue creada en la migración 003.
-- Se reutiliza para registrar eventos de la aplicación.

-- Asegurar columnas utilizadas por el sistema

ALTER TABLE notificacion
ADD COLUMN IF NOT EXISTS tipo_notificacion VARCHAR(50)
    DEFAULT 'Mensaje',
ADD COLUMN IF NOT EXISTS titulo VARCHAR(150),
ADD COLUMN IF NOT EXISTS mensaje TEXT,
ADD COLUMN IF NOT EXISTS fecha_envio TIMESTAMP
    DEFAULT (NOW() AT TIME ZONE 'America/Lima'),
ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT FALSE;


-- ==========================================================
-- 5. ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ==========================================================

-- Consultar valoraciones por niñera

CREATE INDEX IF NOT EXISTS idx_valoracion_ninera
ON valoracion (id_ninera);


-- Consultar valoraciones ordenadas por fecha

CREATE INDEX IF NOT EXISTS idx_valoracion_ninera_fecha
ON valoracion (id_ninera, fecha_creacion DESC);


-- Consultar notificaciones recientes de un usuario

CREATE INDEX IF NOT EXISTS idx_notificacion_usuario_fecha
ON notificacion (id_usuario, fecha_envio DESC);


COMMIT;
