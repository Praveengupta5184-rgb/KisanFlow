-- KisanFlow PostgreSQL schema
-- All application-facing identifiers use quoted camelCase names deliberately.
-- Requires PostgreSQL 14+ and the pgcrypto extension for gen_random_uuid().

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "centreStatus" AS ENUM ('active', 'inactive', 'maintenance', 'suspended');
CREATE TYPE "bookingStatus" AS ENUM (
  'token_generated', 'arrived', 'weighing', 'quality_check',
  'procurement', 'payment_processing', 'payment_released', 'cancelled', 'no_show'
);
CREATE TYPE "procurementStage" AS ENUM (
  'token_generated', 'arrived', 'weighing', 'quality_check',
  'procurement', 'payment_processing', 'payment_released'
);
CREATE TYPE "paymentStatus" AS ENUM ('pending', 'processing', 'released', 'failed', 'cancelled');
CREATE TYPE "qualityResult" AS ENUM ('pending', 'accepted', 'rejected', 'conditional');
CREATE TYPE "alertSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "alertStatus" AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TYPE "notificationChannel" AS ENUM ('app', 'sms', 'ivr');
CREATE TYPE "notificationStatus" AS ENUM ('queued', 'sent', 'delivered', 'failed', 'read');
CREATE TYPE "userRole" AS ENUM ('FARMER', 'OFFICER', 'DISTRICT_OFFICER', 'ADMIN', 'TRADER');


CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(150) NOT NULL,
  "mobileNumber" VARCHAR(20) NOT NULL,
  village VARCHAR(150) NOT NULL,
  "preferredLanguage" VARCHAR(12) NOT NULL DEFAULT 'en',
  "cropType" VARCHAR(80),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "farmers_mobileNumber_key" UNIQUE ("mobileNumber"),
  CONSTRAINT "farmers_mobileNumber_format" CHECK ("mobileNumber" ~ '^[+]?[0-9]{10,15}$')
);

CREATE TABLE "procurementCentres" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(180) NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  address TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  "staffCount" INTEGER NOT NULL DEFAULT 0,
  "processingSpeed" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "currentLoad" INTEGER NOT NULL DEFAULT 0,
  status "centreStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "procurementCentres_capacity_positive" CHECK (capacity > 0),
  CONSTRAINT "procurementCentres_staffCount_nonnegative" CHECK ("staffCount" >= 0),
  CONSTRAINT "procurementCentres_processingSpeed_nonnegative" CHECK ("processingSpeed" >= 0),
  CONSTRAINT "procurementCentres_currentLoad_nonnegative" CHECK ("currentLoad" >= 0),
  CONSTRAINT "procurementCentres_latitude_range" CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT "procurementCentres_longitude_range" CHECK (longitude BETWEEN -180 AND 180)
);

-- This table can instead be replaced by a foreign/authentication-module reference.
-- "officerId" is an external identity reference because no officer master is in scope.
CREATE TABLE "usersAuth" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "externalAuthUserId" UUID UNIQUE,
  role VARCHAR(50) NOT NULL,
  "linkedFarmerId" UUID REFERENCES farmers(id) ON DELETE SET NULL,
  "officerId" UUID,
  username VARCHAR(120) UNIQUE,
  "passwordHash" VARCHAR(255),
  "linkedCentreId" UUID REFERENCES "procurementCentres"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "farmerId" UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE RESTRICT,
  "bookingDate" DATE NOT NULL,
  "timeSlot" TIME NOT NULL,
  "produceQuantity" NUMERIC(12,3) NOT NULL,
  "tokenNumber" INTEGER NOT NULL,
  status "bookingStatus" NOT NULL DEFAULT 'token_generated',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "originalDate" DATE,
  "originalTime" TIME,
  "bookingType" VARCHAR(40) NOT NULL DEFAULT 'NORMAL',
  "weatherAffected" BOOLEAN NOT NULL DEFAULT FALSE,
  "reschedulingStatus" VARCHAR(40),
  "emergencySlotId" UUID,
  "rescheduledAt" TIMESTAMPTZ,
  "weatherReason" TEXT,
  "currentCounter" INTEGER,
  "nextCounter" INTEGER,
  "nextProcess" VARCHAR(150),
  "officerInstruction" TEXT,
  CONSTRAINT "bookings_produceQuantity_positive" CHECK ("produceQuantity" > 0),
  CONSTRAINT "bookings_tokenNumber_positive" CHECK ("tokenNumber" > 0),
  CONSTRAINT "bookings_centre_date_token_key" UNIQUE ("centreId", "bookingDate", "tokenNumber")
);

CREATE TABLE "emergencySlots" (
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
CREATE INDEX "emergencySlots_search_idx" ON "emergencySlots" ("centreId", "slotDate", "timeSlot", "reservedCount");

CREATE TABLE "procurementStatusLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stage "procurementStage" NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "recordedBy" UUID REFERENCES "usersAuth"(id) ON DELETE SET NULL,
  "currentCounter" INTEGER,
  "nextCounter" INTEGER,
  "nextProcess" VARCHAR(150),
  "officerInstruction" TEXT,
  CONSTRAINT "procurementStatusLog_booking_stage_timestamp_key" UNIQUE ("bookingId", stage, "timestamp")
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL,
  status "paymentStatus" NOT NULL DEFAULT 'pending',
  "expectedDate" DATE NOT NULL,
  "actualDate" DATE,
  "delayFlag" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "payments_amount_positive" CHECK (amount >= 0)
);

-- High-write time-series table. See retention strategy at the end of this file.
CREATE TABLE "queueSnapshots" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "currentToken" INTEGER,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "pendingCount" INTEGER NOT NULL DEFAULT 0,
  "activeCounters" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "queueSnapshots_counts_nonnegative" CHECK ("processedCount" >= 0 AND "pendingCount" >= 0 AND "activeCounters" >= 0)
);

CREATE TABLE "centreStats" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "centreId" UUID NOT NULL UNIQUE REFERENCES "procurementCentres"(id) ON DELETE CASCADE,
  "avgQueueLength" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "peakHours" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "avgProcessingSpeed" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "bottleneckStage" "procurementStage",
  "staffEfficiencyScore" NUMERIC(5,2),
  "lastUpdated" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "centreStats_metrics_nonnegative" CHECK ("avgQueueLength" >= 0 AND "avgProcessingSpeed" >= 0),
  CONSTRAINT "centreStats_efficiency_range" CHECK ("staffEfficiencyScore" IS NULL OR "staffEfficiencyScore" BETWEEN 0 AND 100)
);

CREATE TABLE "cropQualityChecks" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  "imageUrl" TEXT,
  "aiRiskResult" "qualityResult" NOT NULL DEFAULT 'pending',
  "finalVerifiedResult" "qualityResult",
  "verifiedBy" UUID REFERENCES "usersAuth"(id) ON DELETE SET NULL,
  "verifiedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cropQualityChecks_verified_consistency" CHECK (("finalVerifiedResult" IS NULL AND "verifiedAt" IS NULL) OR ("finalVerifiedResult" IS NOT NULL AND "verifiedAt" IS NOT NULL))
);

CREATE TABLE "crisisAlerts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE CASCADE,
  "alertType" VARCHAR(80) NOT NULL,
  severity "alertSeverity" NOT NULL,
  message TEXT NOT NULL,
  "suggestedAction" TEXT,
  status "alertStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolvedAt" TIMESTAMPTZ,
  CONSTRAINT "crisisAlerts_resolution_consistency" CHECK ((status <> 'resolved' AND "resolvedAt" IS NULL) OR (status = 'resolved' AND "resolvedAt" IS NOT NULL))
);

CREATE TABLE "anomalyFlags" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "relatedBookingId" UUID REFERENCES bookings(id) ON DELETE SET NULL,
  "flagType" VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  "riskLevel" "alertSeverity" NOT NULL,
  status "alertStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolvedAt" TIMESTAMPTZ
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "farmerId" UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  channel "notificationChannel" NOT NULL,
  message TEXT NOT NULL,
  "sentAt" TIMESTAMPTZ,
  status "notificationStatus" NOT NULL DEFAULT 'queued',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Derived-state history for Digital Twin trends and AI continuous-learning features.
CREATE TABLE "digitalTwinSnapshots" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "twinType" VARCHAR(20) NOT NULL CHECK ("twinType" IN ('farmer', 'centre')),
  "subjectId" UUID NOT NULL,
  "stateJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup and operational-query indexes.
CREATE INDEX "farmers_village_idx" ON farmers (village);
CREATE INDEX "procurementCentres_status_idx" ON "procurementCentres" (status);
CREATE UNIQUE INDEX "usersAuth_linkedFarmerId_key" ON "usersAuth" ("linkedFarmerId") WHERE "linkedFarmerId" IS NOT NULL;
CREATE INDEX "bookings_farmer_status_idx" ON bookings ("farmerId", status, "bookingDate" DESC);
CREATE INDEX "bookings_centre_date_status_token_idx" ON bookings ("centreId", "bookingDate", status, "tokenNumber");
CREATE INDEX "bookings_liveQueue_idx" ON bookings ("centreId", "bookingDate", "tokenNumber")
  WHERE status IN ('token_generated', 'arrived', 'weighing', 'quality_check', 'procurement', 'payment_processing');
CREATE INDEX "procurementStatusLog_booking_timestamp_idx" ON "procurementStatusLog" ("bookingId", "timestamp" DESC);
CREATE INDEX "payments_status_expectedDate_idx" ON payments (status, "expectedDate") WHERE status IN ('pending', 'processing');
CREATE INDEX "queueSnapshots_centre_timestamp_idx" ON "queueSnapshots" ("centreId", "timestamp" DESC);
CREATE INDEX "crisisAlerts_active_idx" ON "crisisAlerts" ("centreId", severity DESC, "createdAt" DESC) WHERE status IN ('active', 'acknowledged');
CREATE INDEX "anomalyFlags_booking_status_idx" ON "anomalyFlags" ("relatedBookingId", status, "createdAt" DESC);
CREATE INDEX "notifications_farmer_status_idx" ON notifications ("farmerId", status, "createdAt" DESC);
CREATE INDEX "digitalTwinSnapshots_subject_createdAt_idx" ON "digitalTwinSnapshots" ("twinType", "subjectId", "createdAt" DESC);
CREATE INDEX "cropQualityChecks_booking_idx" ON "cropQualityChecks" ("bookingId", "createdAt" DESC);
CREATE TABLE "tokenSequences" (
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE CASCADE,
  "bookingDate" DATE NOT NULL,
  "lastToken" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("centreId", "bookingDate")
);

CREATE TABLE traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(150) NOT NULL,
  "mobileNumber" VARCHAR(20) NOT NULL,
  "licenseNumber" VARCHAR(50) NOT NULL UNIQUE,
  "linkedCentreId" UUID REFERENCES "procurementCentres"(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  "centreId" UUID NOT NULL REFERENCES "procurementCentres"(id) ON DELETE RESTRICT,
  "actualWeight" NUMERIC(12,3) NOT NULL,
  "qualityGrade" VARCHAR(20),
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  "basePrice" NUMERIC(12,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "lotId" UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  "traderId" UUID NOT NULL REFERENCES traders(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'placed',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "bids_amount_positive" CHECK (amount > 0)
);

CREATE INDEX "lots_centre_status_idx" ON lots ("centreId", status);
CREATE INDEX "bids_lot_amount_idx" ON bids ("lotId", amount DESC);

ALTER TABLE "usersAuth" ADD COLUMN "traderId" UUID REFERENCES traders(id) ON DELETE SET NULL;

ALTER TABLE "usersAuth" ADD CONSTRAINT "usersAuth_subject_matches_role" CHECK (
  (role = 'FARMER' AND "linkedFarmerId" IS NOT NULL AND "officerId" IS NULL AND "traderId" IS NULL)
  OR (role IN ('OFFICER', 'DISTRICT_OFFICER', 'ADMIN') AND "linkedFarmerId" IS NULL AND "traderId" IS NULL)
  OR (role = 'TRADER' AND "traderId" IS NOT NULL AND "linkedFarmerId" IS NULL AND "officerId" IS NULL)
);

COMMIT;

/*
ER relationships
----------------
farmers 1--N bookings; procurementCentres 1--N bookings.
bookings 1--N procurementStatusLog and cropQualityChecks; bookings 1--0..1 payments.
procurementCentres 1--N queueSnapshots and crisisAlerts; procurementCentres 1--0..1 centreStats.
farmers 1--N notifications and 1--0..1 usersAuth (when role is FARMER).
usersAuth 1--N procurementStatusLog (recordedBy) and cropQualityChecks (verifiedBy).
bookings 1--N anomalyFlags, with the booking relationship optional on each flag.

Partitioning / retention for queueSnapshots
--------------------------------------------
At sustained high write volume, migrate queueSnapshots to monthly RANGE partitions on
"timestamp" (for example queueSnapshots_2026_09 FOR VALUES FROM ('2026-09-01') TO
('2026-10-01')). A partitioned table's primary key must include the partition key in
PostgreSQL, so use PRIMARY KEY (id, "timestamp") after that migration. Create the next
two monthly partitions ahead of time; keep the existing (centreId, timestamp DESC) index
on every partition. Retain raw snapshots for 90 days, roll them up hourly/daily for model
features, then detach and drop the expired monthly partition. Use pg_partman or a scheduled
database job to create/drop partitions; never issue large row-by-row deletes on this table.

Sample operational queries (replace $1, $2, etc. with bound parameters)
--------------------------------------------------------------------------

1. Live queue for centre $1 today
SELECT id, "tokenNumber", "timeSlot", status, "farmerId"
FROM bookings WHERE "centreId" = $1 AND "bookingDate" = CURRENT_DATE
  AND status IN ('token_generated','arrived','weighing','quality_check','procurement','payment_processing')
ORDER BY "tokenNumber";

2. A farmer's active booking
SELECT b.*, c."name" AS "centreName" FROM bookings b JOIN "procurementCentres" c ON c.id = b."centreId"
WHERE b."farmerId" = $1 AND b.status NOT IN ('payment_released','cancelled','no_show')
ORDER BY b."bookingDate", b."timeSlot" LIMIT 1;

3. Farmer token and pipeline history
SELECT b."tokenNumber", b.status, l.stage, l."timestamp"
FROM bookings b LEFT JOIN "procurementStatusLog" l ON l."bookingId" = b.id
WHERE b.id = $1 ORDER BY l."timestamp";

4. All actionable crisis alerts
SELECT * FROM "crisisAlerts" WHERE status IN ('active','acknowledged') ORDER BY severity DESC, "createdAt" DESC;

5. Last 30 days of training data for a centre
SELECT * FROM "queueSnapshots" WHERE "centreId" = $1 AND "timestamp" >= now() - INTERVAL '30 days' ORDER BY "timestamp";

6. Current load percentage of every active centre
SELECT id, "name", ROUND(100.0 * "currentLoad" / capacity, 2) AS "loadPercent"
FROM "procurementCentres" WHERE status = 'active' ORDER BY "loadPercent" DESC;

7. Average elapsed processing time by centre over the past 30 days
WITH stageTimes AS (
  SELECT "bookingId", MIN("timestamp") FILTER (WHERE stage = 'token_generated') AS "generatedAt",
         MIN("timestamp") FILTER (WHERE stage = 'payment_released') AS "releasedAt"
  FROM "procurementStatusLog" GROUP BY "bookingId"
)
SELECT b."centreId", AVG(s."releasedAt" - s."generatedAt") AS "avgProcessingTime"
FROM bookings b JOIN stageTimes s ON s."bookingId" = b.id
WHERE s."generatedAt" >= now() - INTERVAL '30 days' AND s."releasedAt" IS NOT NULL
GROUP BY b."centreId";

8. Top five most congested centres today
SELECT c.id, c."name", COUNT(*) AS "pendingTokens"
FROM "procurementCentres" c JOIN bookings b ON b."centreId" = c.id
WHERE b."bookingDate" = CURRENT_DATE AND b.status NOT IN ('payment_released','cancelled','no_show')
GROUP BY c.id, c."name" ORDER BY "pendingTokens" DESC LIMIT 5;

9. Overdue payments
SELECT p.*, b."farmerId", b."centreId" FROM payments p JOIN bookings b ON b.id = p."bookingId"
WHERE p.status IN ('pending','processing') AND p."expectedDate" < CURRENT_DATE ORDER BY p."expectedDate";

10. Payments released late
SELECT * FROM payments WHERE "delayFlag" OR ("actualDate" > "expectedDate") ORDER BY "expectedDate";

11. Latest snapshot for each centre
SELECT DISTINCT ON ("centreId") * FROM "queueSnapshots" ORDER BY "centreId", "timestamp" DESC;

12. Average pending queue by centre for the last 24 hours
SELECT "centreId", AVG("pendingCount") AS "averagePending" FROM "queueSnapshots"
WHERE "timestamp" >= now() - INTERVAL '24 hours' GROUP BY "centreId" ORDER BY "averagePending" DESC;

13. Quality checks awaiting human verification
SELECT q.*, b."centreId", b."tokenNumber" FROM "cropQualityChecks" q JOIN bookings b ON b.id = q."bookingId"
WHERE q."finalVerifiedResult" IS NULL ORDER BY q."createdAt";

14. Active anomaly flags for a booking
SELECT * FROM "anomalyFlags" WHERE "relatedBookingId" = $1 AND status IN ('active','acknowledged') ORDER BY "riskLevel" DESC, "createdAt" DESC;

15. Notification delivery failures requiring retry
SELECT * FROM notifications WHERE status = 'failed' AND "createdAt" >= now() - INTERVAL '7 days' ORDER BY "createdAt";
*/

