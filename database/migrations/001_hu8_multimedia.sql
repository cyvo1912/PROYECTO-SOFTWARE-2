-- ==========================================================
-- Migración 001 - HU8: foto de perfil y certificados
-- Base de Datos: PostgreSQL (Neon)
-- Ejecutar una sola vez en el SQL Editor de Neon. Es idempotente:
-- volver a ejecutarla no rompe nada.
-- ==========================================================

-- Foto de perfil (familia y niñera). Se guarda la URL pública y el
-- identificador de Cloudinary para poder reemplazarla o borrarla.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto_public_id VARCHAR(255);

-- Certificados de la niñera. El archivo es privado en Cloudinary;
-- estado_revision lo actualiza el administrador en HU9.
CREATE TABLE IF NOT EXISTS certificado (
    id_certificado        SERIAL PRIMARY KEY,
    id_ninera             INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
    tipo                  VARCHAR(40) NOT NULL CHECK (tipo IN (
                              'PRIMEROS_AUXILIOS', 'RCP', 'EDUCACION_INICIAL', 'CUIDADO_INFANTIL',
                              'ANTECEDENTES_POLICIALES', 'ANTECEDENTES_PENALES', 'OTRO')),
    nombre                VARCHAR(100) NOT NULL,
    institucion           VARCHAR(100) NOT NULL,
    fecha_emision         DATE NOT NULL,
    fecha_vencimiento     DATE,
    archivo_public_id     VARCHAR(255) NOT NULL,
    archivo_formato       VARCHAR(10) NOT NULL,
    archivo_tipo_recurso  VARCHAR(10) NOT NULL DEFAULT 'image',
    estado_revision       VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                              CHECK (estado_revision IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    fecha_subida          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento > fecha_emision)
);

CREATE INDEX IF NOT EXISTS idx_certificado_ninera ON certificado(id_ninera);
