-- ==========================================================
-- Migración 005 - HU: Solicitar reservas con cálculo de tarifa
-- y validación de solapamiento de horarios.
-- La tabla `reserva` ya existe (schema.sql); aquí se agregan los
-- campos del cálculo de tarifa y las reglas de integridad.
-- ==========================================================

ALTER TABLE reserva ADD COLUMN IF NOT EXISTS tarifa_hora NUMERIC(10, 2);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS horas NUMERIC(5, 2);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS monto_total NUMERIC(10, 2);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Una reserva "Pendiente" separa el horario solo hasta esta hora (10 min).
-- Si no se paga antes, el horario se libera para otras familias.
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS expira_en TIMESTAMPTZ;

-- La hora de fin debe ser posterior a la de inicio (no se cruzan medianoche).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_reserva_horario_valido'
  ) THEN
    ALTER TABLE reserva
      ADD CONSTRAINT chk_reserva_horario_valido CHECK (hora_fin > hora_inicio);
  END IF;
END $$;

-- Acelera la búsqueda de solapamientos por niñera y fecha.
CREATE INDEX IF NOT EXISTS idx_reserva_ninera_fecha
ON reserva (id_ninera, fecha_reserva);
