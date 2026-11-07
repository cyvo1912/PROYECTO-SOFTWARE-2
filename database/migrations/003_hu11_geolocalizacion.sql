-- ==========================================================
-- Migración 003 - HU11: Búsqueda de niñeras por proximidad
-- Agrega coordenadas de ubicación y años de experiencia (numérico)
-- a la tabla ninera, necesarios para filtrar por cercanía (Haversine)
-- y por experiencia mínima respectivamente.
-- El campo "experiencia" existente queda intacto (texto libre / descripción).
-- ==========================================================

ALTER TABLE ninera
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS anos_experiencia SMALLINT;

-- Acelera el filtrado de niñeras con ubicación registrada (HU11)
CREATE INDEX IF NOT EXISTS ix_ninera_ubicacion
  ON ninera (latitud, longitud)
  WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
