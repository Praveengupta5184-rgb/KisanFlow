ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "currentCounter" INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "nextCounter" INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "nextProcess" VARCHAR(150);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "officerInstruction" TEXT;
ALTER TABLE "procurementStatusLog" ADD COLUMN IF NOT EXISTS "currentCounter" INTEGER;
ALTER TABLE "procurementStatusLog" ADD COLUMN IF NOT EXISTS "nextCounter" INTEGER;
ALTER TABLE "procurementStatusLog" ADD COLUMN IF NOT EXISTS "nextProcess" VARCHAR(150);
ALTER TABLE "procurementStatusLog" ADD COLUMN IF NOT EXISTS "officerInstruction" TEXT;
