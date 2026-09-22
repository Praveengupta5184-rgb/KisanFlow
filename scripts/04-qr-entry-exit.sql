-- KisanFlow Migration 04 – QR identity + Physical Entry/Exit tracking
-- Run once against an existing database (idempotent via IF NOT EXISTS / IF EXISTS guards).
-- Docker init: mounted as 04-qr-entry-exit.sql in /docker-entrypoint-initdb.d/

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1.  QR fields on bookings
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS "qrId"      VARCHAR(64)  NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS "qrVersion" INTEGER      NOT NULL DEFAULT 1;

-- Unique constraint (silent if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_qrId_key' AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT "bookings_qrId_key" UNIQUE ("qrId");
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2.  Physical Entry/Exit table
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mandiEntryExit" (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID         NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  "farmerId"  UUID         NOT NULL REFERENCES farmers(id)          ON DELETE RESTRICT,
  "centreId"  UUID         NOT NULL REFERENCES "procurementCentres"(id) ON DELETE RESTRICT,
  "qrId"      VARCHAR(64)  NOT NULL,
  "entryTime" TIMESTAMPTZ,
  "exitTime"  TIMESTAMPTZ,
  "insideMandi"   BOOLEAN  NOT NULL DEFAULT FALSE,
  "entryStatus"   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "exitStatus"    VARCHAR(20) NOT NULL DEFAULT 'NOT_EXITED',
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "mandiEntryExit_entryStatus_check"
    CHECK ("entryStatus" IN ('PENDING', 'ENTERED', 'EXITED')),
  CONSTRAINT "mandiEntryExit_exitStatus_check"
    CHECK ("exitStatus"  IN ('NOT_EXITED', 'EXITED')),
  CONSTRAINT "mandiEntryExit_times_check"
    CHECK (
      ("exitTime" IS NULL) OR
      ("entryTime" IS NOT NULL AND "exitTime" >= "entryTime")
    )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3.  Indexes
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "bookings_qrId_idx"
  ON bookings ("qrId");

CREATE INDEX IF NOT EXISTS "mandiEntryExit_centreId_insideMandi_idx"
  ON "mandiEntryExit" ("centreId", "insideMandi");

CREATE INDEX IF NOT EXISTS "mandiEntryExit_qrId_idx"
  ON "mandiEntryExit" ("qrId");

CREATE INDEX IF NOT EXISTS "mandiEntryExit_farmerId_idx"
  ON "mandiEntryExit" ("farmerId");

COMMIT;
