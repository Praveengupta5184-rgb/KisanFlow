-- KisanFlow: Initialize Default Officer Accounts
-- Run this script in PostgreSQL after the main schema is created
-- Place this in a docker-entrypoint or manual execution

-- NOTE: Password hashes below are BCrypt hashes
-- Password for 'officer_kapurthala': KapurthalaOfficer@123
-- Password for 'officer_patiala': PatialaOfficer@123
-- Password for 'district_manager': DistrictManager@123

-- ============================================================================
-- PROCUREMENT CENTRE SETUP
-- ============================================================================
INSERT INTO "procurementCentres" 
  (id, "name", latitude, longitude, address, capacity, "staffCount", "processingSpeed", status)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Kapurthala Main Mandi (कपूरथला मुख्य मंडी)',
    31.3849,
    75.3848,
    'Kapurthala, Punjab 144001',
    500,
    8,
    12.5,
    'active'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'Patiala Central Yard (पटियाला सेंट्रल यार्ड)',
    30.3398,
    76.3869,
    'Patiala, Punjab 140001',
    800,
    12,
    15.0,
    'active'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d481',
    'Rajpura Smart Agri Hub (राजपुरा स्मार्ट कृषि केंद्र)',
    30.6449,
    76.8203,
    'Rajpura, Patiala, Punjab 140401',
    600,
    10,
    14.0,
    'active'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- OFFICER ACCOUNTS (Kapurthala)
-- ============================================================================
INSERT INTO "usersAuth" 
  (id, role, username, "passwordHash", "linkedCentreId")
VALUES
  (
    '00000001-0000-0000-0000-000000000001',
    'OFFICER',
    'officer_kapurthala',
    -- BCrypt: KapurthalaOfficer@123
    '$2b$12$ONnCeAuoLqyYQiCdlcBHgu03ief8O6fVt3vACjEYssjFwyKP5T0YS',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  );

-- ============================================================================
-- OFFICER ACCOUNTS (Patiala)
-- ============================================================================
INSERT INTO "usersAuth" 
  (id, role, username, "passwordHash", "linkedCentreId")
VALUES
  (
    '00000002-0000-0000-0000-000000000002',
    'OFFICER',
    'officer_patiala',
    -- BCrypt: PatialaOfficer@123
    '$2a$10$slYQmyNdGzin7olVeolvkunY14FuN9wBPVkl5ExPVVEBPsX2KLCS',
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'
  );

-- ============================================================================
-- DISTRICT OFFICER (Manager for entire region)
-- ============================================================================
INSERT INTO "usersAuth" 
  (id, role, username, "passwordHash", "linkedCentreId")
VALUES
  (
    '00000003-0000-0000-0000-000000000003',
    'DISTRICT_OFFICER',
    'district_manager',
    -- BCrypt: DistrictManager@123
    '$2a$10$SsSdBq6KM7vF2LLLQJ2TM.qnmBL7HVzIKp2qf5K8X.X6N5GW1L.Tm',
    NULL
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT 'Officers Created:' as status;
SELECT username, role, "linkedCentreId" FROM "usersAuth" WHERE role IN ('OFFICER', 'DISTRICT_OFFICER');
