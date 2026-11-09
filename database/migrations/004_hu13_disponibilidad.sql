-- ==========================================================
-- Migración 004 - HU13: Disponibilidad y Calendario de Niñeras
-- ==========================================================

CREATE TABLE IF NOT EXISTS disponibilidad (
    id_disponibilidad SERIAL PRIMARY KEY,
    id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    fecha DATE,
    dia_semana VARCHAR(20),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(30) DEFAULT 'Disponible'
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_ninera_fecha 
ON disponibilidad (id_ninera, fecha);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_ninera_dia 
ON disponibilidad (id_ninera, dia_semana);
