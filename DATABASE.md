# Database Migration

`backend/prisma/schema.prisma` is the target PostgreSQL schema. `docker-compose.yml` starts a local PostgreSQL 16 instance.

The current application still reads `backend/data/db.json`; no production route has been switched to Prisma yet. Prisma 7 is installed, the schema validates through client generation, and the initial migration SQL exists at `backend/prisma/migrations/20260920103000_initial_postgresql/migration.sql`. Migration application is pending because this environment has no Docker or PostgreSQL server.

The import bridge is `backend/scripts/import-json-to-postgres.js`. It preserves password hashes and legacy IDs, creates one farm per existing user, normalizes crops, creates simulator devices, labels legacy sensor readings as `SIMULATED`, and imports irrigation history transactionally. Legacy JSON alert entries are read markers without alert payloads, so they are reported rather than silently fabricated. `backend/scripts/verify-json-postgres.js` compares imported counts.

## Planned Migration

1. Install/start PostgreSQL 16 or run `docker compose up -d postgres`.
2. Set `DATABASE_URL` from `backend/.env.example`.
3. Run `cd backend; npm run prisma:validate; npm run prisma:generate`.
4. Apply the reviewed migration with `npx prisma migrate deploy`.
5. Import JSON data with `npm run db:import-json`.
6. Compare records with `npm run db:verify`; stop on any mismatch.
7. Switch routes to repositories behind a feature flag and run PostgreSQL integration tests.
8. Remove JSON writes only after output comparison, backup, rollback, and authorization verification.

The schema uses foreign keys, indexes, timestamps, soft deletion for farms and plots, unique event keys for idempotency, and explicit provenance for sensor/weather data.