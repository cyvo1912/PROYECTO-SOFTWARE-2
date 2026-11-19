-- Fecha y comisión del pago simulado, registradas al confirmar la reserva.
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS comision_plataforma NUMERIC(10,2);
