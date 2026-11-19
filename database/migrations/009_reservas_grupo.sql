ALTER TABLE reserva ADD COLUMN IF NOT EXISTS grupo_reserva UUID;
CREATE INDEX IF NOT EXISTS idx_reserva_grupo ON reserva (grupo_reserva);
