# API Contract

The existing API is documented in `README.md`. Protected endpoints require `Authorization: Bearer <token>` until the session migration is complete.

## Hardening Rules

- JSON bodies are limited to 32 KB.
- Registration, login, plot writes, and irrigation logs are schema-validated.
- Invalid input returns `400` with `{ error, details }`.
- Plot updates accept only known plot fields.
- Plot resources remain ownership-scoped on the server.
- Async route failures are forwarded to centralized error handling.
- New integrations should include an idempotency key and request ID.

## Planned Additions

- Farm and role management endpoints.
- Device registration and authenticated sensor ingestion.
- Cached weather status and provenance fields.
- Advisory acknowledgement, override, and outcome endpoints.
- Notification delivery status endpoints.