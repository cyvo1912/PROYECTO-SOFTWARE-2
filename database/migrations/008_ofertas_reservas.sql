-- Vincula una reserva a la postulación elegida por la familia.
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS id_postulacion INT REFERENCES postulacion(id_postulacion);
CREATE INDEX IF NOT EXISTS idx_reserva_postulacion ON reserva (id_postulacion);
