CREATE TABLE IF NOT EXISTS "cropPrices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE CASCADE,
  "cropType" VARCHAR(80) NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  "updatedBy" VARCHAR(120),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cropPrices_centre_crop_key" UNIQUE ("centreId", "cropType")
);

CREATE INDEX IF NOT EXISTS "cropPrices_centre_idx" ON "cropPrices" ("centreId", "cropType");