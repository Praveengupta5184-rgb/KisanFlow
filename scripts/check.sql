SELECT id, name FROM "procurementCentres" LIMIT 10;
SELECT b.id, b."tokenNumber", b.status, b."bookingDate", b."centreId", f.name as farmer
FROM bookings b
JOIN farmers f ON b."farmerId" = f.id
ORDER BY b."createdAt" DESC
LIMIT 10;
