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

## Migration-phase status

- Prisma client generation passes against the current schema.
- The initial SQL migration was generated offline.
- PostgreSQL-backed integration tests cannot run until a PostgreSQL server is available.
- `db:verify` is designed to fail with a mismatch status instead of silently accepting missing records.