-- ==========================================================
-- Migración 003 - HU12: Perfil público ampliado de la niñera
-- Base de Datos: PostgreSQL (Neon)
-- Ejecutar una sola vez en el SQL Editor de Neon. Es idempotente:
-- volver a ejecutarla no rompe nada.
-- ==========================================================

-- La biografía reutiliza la columna "descripcion" que ya existe (HU5, "Sobre mí").
-- Se agregan solo los datos nuevos del perfil público:
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS anios_experiencia INT
    CHECK (anios_experiencia IS NULL OR (anios_experiencia >= 0 AND anios_experiencia <= 40));

-- Listas de opciones (TEXT[] = arreglo de textos; PostgreSQL lo devuelve como arreglo de JavaScript)
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS habilidades TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS idiomas     TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS distritos   TEXT[] NOT NULL DEFAULT '{}';
