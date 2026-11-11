-- ==========================================================
-- Migración 005 - HU14: Bolsa de Trabajo
-- Ofertas de trabajo publicadas por familias y postulaciones de niñeras.
-- Idempotente: se puede ejecutar más de una vez sin errores.
-- ==========================================================

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

CREATE INDEX IF NOT EXISTS idx_oferta_trabajo_estado_fecha
ON oferta_trabajo (estado, fecha_inicio);

CREATE INDEX IF NOT EXISTS idx_oferta_trabajo_padre
ON oferta_trabajo (id_padre);

CREATE TABLE IF NOT EXISTS postulacion (
    id_postulacion SERIAL PRIMARY KEY,
    id_oferta INT NOT NULL REFERENCES oferta_trabajo(id_oferta) ON DELETE CASCADE,
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    mensaje TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
    fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_oferta, id_ninera)
);

CREATE INDEX IF NOT EXISTS idx_postulacion_ninera
ON postulacion (id_ninera);
