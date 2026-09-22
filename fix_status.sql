DROP INDEX IF EXISTS "notifications_farmer_status_idx";
ALTER TABLE notifications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
CREATE INDEX "notifications_farmer_status_idx" ON notifications ("farmerId", status, "createdAt" DESC);
