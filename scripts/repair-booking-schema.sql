-- Existing demo volumes created by an older Hibernate naming strategy may retain
-- duplicate snake_case booking columns alongside the canonical camelCase columns.
ALTER TABLE IF EXISTS bookings
  ALTER COLUMN centre_id DROP NOT NULL,
  ALTER COLUMN farmer_id DROP NOT NULL;
