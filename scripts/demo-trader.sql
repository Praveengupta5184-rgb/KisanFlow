INSERT INTO "traders" (id, name, "mobileNumber", "licenseNumber", "linkedCentreId")
VALUES (
  '00000004-0000-0000-0000-000000000004',
  'Demo Trader',
  '9876543210',
  'TRD-12345',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
) ON CONFLICT DO NOTHING;

INSERT INTO "usersAuth" (id, role, username, "passwordHash", "traderId", "linkedCentreId")
VALUES (
  '00000004-0000-0000-0000-000000000004',
  'TRADER',
  'demo_trader',
  '$2b$12$ONnCeAuoLqyYQiCdlcBHgu03ief8O6fVt3vACjEYssjFwyKP5T0YS',
  '00000004-0000-0000-0000-000000000004',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'
) ON CONFLICT DO NOTHING;
