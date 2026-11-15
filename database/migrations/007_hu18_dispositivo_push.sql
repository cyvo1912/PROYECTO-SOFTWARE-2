-- HU18: tokens de notificaciones push (Expo) por usuario.
-- PostgresNotificacionRepository usa esta tabla (registrarToken y obtenerTokensActivos),
-- pero ninguna migración anterior la creaba. Es segura de ejecutar aunque ya exista.
CREATE TABLE IF NOT EXISTS dispositivo_push (
    id_dispositivo   SERIAL PRIMARY KEY,
    id_usuario       INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    expo_push_token  TEXT NOT NULL UNIQUE,
    plataforma       VARCHAR(20),
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispositivo_push_usuario ON dispositivo_push (id_usuario);

-- PostgresNotificacionRepository guarda la reserva relacionada con cada
-- notificación, pero ninguna migración anterior creaba esa columna.
ALTER TABLE notificacion
    ADD COLUMN IF NOT EXISTS id_reserva INT REFERENCES reserva(id_reserva) ON DELETE CASCADE;
