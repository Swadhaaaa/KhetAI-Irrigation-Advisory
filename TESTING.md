# Testing Strategy

## Current automated coverage

Run `cd backend; npm test` to execute the Vitest and Supertest suite. The current tests cover health, weak registration input, protected plot access, and malformed irrigation input.

## Required expansion

- Unit tests for every advisory boundary, soil profile, rainfall adjustment, fertigation stage, and yield baseline.
- Integration tests for registration/login, token expiry, cross-user access, plot update allowlists, deletion consistency, and alert read authorization.
- Weather tests for provider success, timeout, malformed payload, cache freshness, and fallback provenance.
- Sensor tests for range checks, duplicate events, stale devices, outliers, and simulator labeling.
- Frontend XSS, accessibility, mobile, loading, cancellation, and error-state tests.
- Security tests for brute force, rate limits, injection, CSRF strategy, and headers.
- Migration tests with row counts, foreign keys, and rollback verification.

## PostgreSQL integration tests

The opt-in suite is `backend/tests/postgres.integration.test.mjs`. It refuses production, refuses `DATABASE_URL`, and requires a local database named `khetai_test` through `DATABASE_URL_TEST`.

Example with a dedicated local PostgreSQL instance:

```powershell
cd backend
$env:NODE_ENV = "test"
$env:RUN_PG_INTEGRATION_TESTS = "1"
$env:TEST_DB_PASSWORD = "replace-locally"
$env:DATABASE_URL_TEST = "postgresql://khetai_test:$env:TEST_DB_PASSWORD@127.0.0.1:5433/khetai_test?schema=public"
npx prisma migrate deploy
npm run test:integration
```

The suite creates unique test users and plots, verifies ownership isolation, exercises sensor/irrigation/advisory/alert/fertigation/yield/model records, and deletes only its own records in teardown. The default `npm test` remains safe and does not require a database.

## Migration-phase status

- Prisma client generation passes against the current schema.
- The initial SQL migration was generated offline.
- PostgreSQL-backed integration tests require a separate local `khetai_test` PostgreSQL database and are not pointed at Supabase production.
- `db:verify` is designed to fail with a mismatch status instead of silently accepting missing records.