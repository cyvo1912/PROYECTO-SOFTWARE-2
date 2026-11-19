-- Revocación persistente de JWT (logout).
-- Antes la lista de tokens revocados vivía solo en memoria y se perdía al reiniciar
-- el servidor, con lo que un token cerrado volvía a ser válido hasta expirar (7 días).
-- Se guarda la huella SHA-256 del token, no el token. Es segura de ejecutar aunque ya exista.
CREATE TABLE IF NOT EXISTS token_revocado (
    huella_token  CHAR(64) PRIMARY KEY,
    expira_en     TIMESTAMP NOT NULL,
    fecha_revocado TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_revocado_expira ON token_revocado (expira_en);
