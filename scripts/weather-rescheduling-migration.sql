ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS "originalDate" DATE,
  ADD COLUMN IF NOT EXISTS "originalTime" TIME,
  ADD COLUMN IF NOT EXISTS "bookingType" VARCHAR(40) NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "weatherAffected" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "reschedulingStatus" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "emergencySlotId" UUID,
  ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "weatherReason" TEXT;
CREATE TABLE IF NOT EXISTS "emergencySlots" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE CASCADE,
  "slotDate" DATE NOT NULL,
  "timeSlot" TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  "reservedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "emergencySlots_capacity_key" CHECK (capacity = 10),
  CONSTRAINT "emergencySlots_reserved_key" CHECK ("reservedCount" >= 0 AND "reservedCount" <= capacity),
  CONSTRAINT "emergencySlots_centre_date_time_key" UNIQUE ("centreId", "slotDate", "timeSlot")
);
CREATE INDEX IF NOT EXISTS "emergencySlots_search_idx" ON "emergencySlots" ("centreId", "slotDate", "timeSlot", "reservedCount");