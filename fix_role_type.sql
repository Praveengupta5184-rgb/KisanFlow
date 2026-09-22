-- Fix: Convert "userRole" custom enum to plain VARCHAR so Hibernate can insert without cast errors
ALTER TABLE "usersAuth" DROP CONSTRAINT IF EXISTS "usersAuth_subject_matches_role";
ALTER TABLE "usersAuth" ALTER COLUMN role TYPE VARCHAR(50) USING role::varchar;
ALTER TABLE "usersAuth" ADD CONSTRAINT "usersAuth_subject_matches_role" CHECK (
  (role = 'FARMER' AND "linkedFarmerId" IS NOT NULL AND "officerId" IS NULL)
  OR (role IN ('OFFICER', 'DISTRICT_OFFICER', 'ADMIN', 'TRADER') AND "linkedFarmerId" IS NULL)
);

