# KisanFlow local demo

Copy `.env.example` to `.env`, replace demo credentials, then run:

```powershell
docker compose up --build
```

Services: Farmer app `http://localhost:3000`, officer dashboard `http://localhost:3001`, backend/OpenAPI `http://localhost:8080/swagger-ui.html`, AI docs `http://localhost:8000/docs`, simulation docs `http://localhost:8100/docs`, and pgAdmin `http://localhost:5050`.

Inside Docker, services use DNS names rather than `localhost`: backend database URL is `jdbc:postgresql://postgres:5432/kisanflow`, AI is `http://ai-service:8000`, and simulation is `http://simulation-service:8100`. The CV capability runs inside `ai-service`.

Run the pre-demo API walkthrough with `./scripts/demo-e2e.ps1` after assigning an officer JWT. PostgreSQL initialization occurs only for a new `postgres-data` volume; to reinitialize a disposable demo database, run `docker compose down -v`.

For an existing demo volume with token-booking errors caused by duplicate legacy booking columns, apply `scripts/repair-booking-schema.sql` once with `psql` before restarting the backend.

Weather rescheduling uses the configurable `WEATHER_SEVERE_DATES` list until a live weather provider is connected. Use ISO dates or date-times, for example `WEATHER_SEVERE_DATES=2026-09-06,2026-09-07T10:00`, then run `docker compose up -d --build backend`.

For an existing database, apply `scripts/weather-rescheduling-migration.sql` once. Emergency capacity is 10 seats per generated date/time slot, normal bookings never use that pool, and rescheduling keeps the original token number.
