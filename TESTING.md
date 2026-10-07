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

## STQA Experiment No. 01: Results

**Project scope:** KhetAI is an irrigation advisory and agricultural decision-support application. All test artifacts and results below are limited to its agricultural functionality and supporting API, data, and frontend behavior.

### Test execution environment

- Node.js: 22.19.0
- Backend test runner: Vitest 5
- API integration runner: Supertest 7
- Runtime: Node.js Express 4
- Database: PostgreSQL integration tests are opt-in and require a safe local `khetai_test` database through `DATABASE_URL_TEST`
- Coverage: not measured because the coverage plugin is not installed in the backend dependencies
- Execution date/time: 2026-10-07 at 23:07:57 local time

### Results summary

| Test area | Executed | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| API and security | 4 | 4 | 0 | 0 | Pass |
| Sensor quality | 4 | 4 | 0 | 0 | Pass |
| Synthetic agricultural data | 6 | 6 | 0 | 0 | Pass |
| Data-driven advisory calculations | 5 | 5 | 0 | 0 | Pass |
| Performance benchmarks | 2 | 2 | 0 | 0 | Pass |
| Keyword-driven KhetAI scenarios | 3 | 3 | 0 | 0 | Pass |
| PostgreSQL integration | 0 | 0 | 0 | 4 | Opt-in suite skipped without `DATABASE_URL_TEST` |
| **Full test suite** | **27** | **23** | **0** | **4** | **Pass** |

The complete Vitest run used `cd backend; $env:CI='1'; .\node_modules\.bin\vitest.cmd run --reporter=verbose --no-color --coverage=false`. The command completed with 6 test files passed, 1 test file skipped, 23 tests passed, 0 tests failed, and 4 tests skipped.

### Data-driven testing

The data-driven suite evaluated five agricultural advisory fixtures stored in `backend/tests/data/advisory-cases.json` against `computeIrrigationAdvisory`.

- Low soil moisture: immediate irrigation required
- Moderate soil moisture: short delay recommended
- Field-capacity moisture: no immediate irrigation required
- Sandy-soil buffer: shorter irrigation window required
- Near-saturation moisture: irrigation delayed

All five fixtures produced the expected production results. The suite covered soil moisture, crop age, soil temperature, soil type, and weather-adjusted irrigation timing.

### Keyword-driven testing

The keyword-driven suite executed three KhetAI business scenarios from `backend/tests/data/keyword-scenarios.json`.

1. `LoginUser` → `CreatePlot` → `VerifyWeatherSource` → `CalculateAdvisory` → `GenerateRecommendation` → `CheckRecommendation` → `DisplayDashboard`
2. `LoginUser` → `CreatePlot` → `UpdatePlot` → `ValidateSensorData` → `CalculateAdvisory` → `GenerateAlert` → `DeletePlot`
3. Invalid agricultural sensor input rejected by `ValidateSensorData`

All three scenarios passed. The invalid-input case correctly rejected a humidity reading outside the accepted agricultural range rather than accepting it through the generic plot request schema.

### Synthetic data generation

The synthetic-data suite used six controlled agricultural sensor and weather records stored in `backend/tests/data/synthetic-records.json`.

- Two valid moisture and weather readings
- One boundary value at 0% soil moisture
- One boundary value at 100% soil moisture
- One invalid unit mismatch
- One out-of-range humidity reading

Each record was validated through the production `classifyMeasurement` utility. All six records were accepted or rejected according to the implemented agricultural field rules.

### Performance testing

Two deterministic benchmark cases were executed from `backend/tests/data/performance-cases.json`.

- 100 advisory calculations: passed within the configured 200 ms threshold
- 500 advisory calculations: passed within the configured 1000 ms threshold

The benchmark run completed in 1.89 seconds for the complete suite. The two performance tests themselves completed in 22 ms, with no failures.

### PostgreSQL integration status

The PostgreSQL integration suite is present in `backend/tests/postgres.integration.test.mjs`, but it was skipped because `DATABASE_URL_TEST` was not configured. The suite has four opt-in tests and remains excluded from the default safe test run. Its execution requires a dedicated local `khetai_test` database, schema migration, and a non-production connection string.

### Risks and limitations

- Coverage was not measured because the backend does not currently include a coverage plugin or coverage script.
- PostgreSQL integration remains dependent on a local database and is intentionally skipped by default.
- The performance thresholds are local, deterministic benchmarks and do not represent production-scale load testing.
- The current suite validates the implemented KhetAI rules but does not yet cover every route, frontend interaction, security boundary, or external weather-provider failure mode.
- The repository does not contain a separate ML training pipeline, model artifact, or automated coverage report for the irrigation-advisory domain.

### Final outcome

STQA Experiment No. 01 verified the current KhetAI irrigation-advisory implementation through API, data-driven, keyword-driven, synthetic-data, and performance testing. The experiment completed with 23 passed tests, 0 failed tests, and 4 skipped opt-in PostgreSQL tests.