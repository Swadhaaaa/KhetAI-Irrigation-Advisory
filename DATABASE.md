# Database Migration

`backend/prisma/schema.prisma` is the target PostgreSQL schema. `docker-compose.yml` starts a local PostgreSQL 16 instance.

The runtime application now reads and writes PostgreSQL through `backend/repositories/postgres.repository.js`. Prisma 7 is installed, the schema validates, and the initial migration SQL exists at `backend/prisma/migrations/20260920103000_initial_postgresql/migration.sql`. The JSON adapter remains only for import/verification history and has not been deleted.

The import bridge is `backend/scripts/import-json-to-postgres.js`. It preserves password hashes and legacy IDs, creates one farm per existing user, normalizes crops, creates simulator devices, labels legacy sensor readings as `SIMULATED`, and imports irrigation history transactionally. Legacy JSON alert entries are read markers without alert payloads, so they are reported rather than silently fabricated. `backend/scripts/verify-json-postgres.js` compares imported counts.

## Planned Migration

1. Install/start PostgreSQL 16 or run `docker compose up -d postgres`.
2. Set `DATABASE_URL` from `backend/.env.example`.
3. Run `cd backend; npm run prisma:validate; npm run prisma:generate`.
4. Apply the reviewed migration with `npx prisma migrate deploy`.
5. Import JSON data with `npm run db:import-json`.
6. Compare records with `npm run db:verify`; stop on any mismatch.
7. Run PostgreSQL integration tests and monitor the migrated runtime in staging.
8. Remove JSON writes only after output comparison, backup, rollback, and authorization verification; keep the fixture for migration recovery until then.

The schema uses foreign keys, indexes, timestamps, soft deletion for farms and plots, unique event keys for idempotency, and explicit provenance for sensor/weather data.

## Phase 4 Hardening

- Runtime queries have bounded defaults: plots are capped at 100, sensor history at 100, and irrigation history at 100 per request.
- `page` and `limit` are accepted on plot and irrigation-history endpoints; pagination metadata is returned only when requested, preserving legacy responses.
- Sensor and irrigation queries use plot/time indexes; alert reads use the composite primary key and ownership join.
- Registration, plot/crop changes, alert persistence, simulator backfill, and import use transactions where related writes must remain atomic.
- Plot initialization compensates by deleting the newly created plot if simulator initialization fails.
- No new schema migration was required in Phase 4; existing foreign keys, unique event keys, ownership indexes, and cascade policies were retained.
- The opt-in PostgreSQL integration suite is guarded by a separate local `DATABASE_URL_TEST` and never falls back to Supabase production.