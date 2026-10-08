-- ==========================================================
-- Migración 002 - HU9: Verificación de niñeras
-- ==========================================================

ALTER TABLE ninera
ADD COLUMN IF NOT EXISTS verificada BOOLEAN DEFAULT FALSE;

UPDATE ninera
SET verificada = FALSE
WHERE verificada IS NULL;

