CREATE TABLE IF NOT EXISTS valoracion (
  id_valoracion SERIAL PRIMARY KEY,
  id_reserva INT UNIQUE NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
  id_padre INT NOT NULL REFERENCES padre(id_padre) ON DELETE CASCADE,
  id_ninera INT NOT NULL REFERENCES ninera(id_ninera) ON DELETE CASCADE,
  calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario TEXT,
  fecha_valoracion TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Lima')
);

CREATE INDEX IF NOT EXISTS idx_valoracion_ninera ON valoracion (id_ninera, fecha_valoracion DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_valoracion_reserva ON valoracion (id_reserva);
