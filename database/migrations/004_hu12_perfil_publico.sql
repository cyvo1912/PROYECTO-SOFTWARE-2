-- ==========================================================
-- Migración 004 - HU12: Perfil público ampliado de la niñera
-- Base de Datos: PostgreSQL (Neon)
-- Ejecutar una sola vez en el SQL Editor de Neon. Es idempotente:
-- volver a ejecutarla no rompe nada.
-- ==========================================================

-- La biografía reutiliza la columna "descripcion" (HU5, "Sobre mí") y los años de
-- experiencia reutilizan "anos_experiencia" (HU11), así la búsqueda filtra con el
-- mismo dato que la niñera llena en su perfil público.
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS anos_experiencia SMALLINT;

-- Listas de opciones (TEXT[] = arreglo de textos; PostgreSQL lo devuelve como arreglo de JavaScript)
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS habilidades TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS idiomas     TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE ninera ADD COLUMN IF NOT EXISTS distritos   TEXT[] NOT NULL DEFAULT '{}';

-- La primera versión de esta migración creó "anios_experiencia" (duplicado de
-- "anos_experiencia" de la HU11). Se elimina para dejar una sola columna.
ALTER TABLE ninera DROP COLUMN IF EXISTS anios_experiencia;
