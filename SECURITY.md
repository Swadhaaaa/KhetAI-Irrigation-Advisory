# Security Model

## Implemented in the current slice

- bcrypt password hashing remains in use.
- Protected routes verify JWTs and resource ownership.
- Helmet security headers are enabled.
- CORS can be restricted with `CORS_ORIGINS`.
- JSON body size is limited.
- Global rate limiting is enabled.
- Auth, plot, and irrigation inputs use Zod schemas.
- JWT configuration is required at server startup.
- Async route failures reach centralized error handling.

## Still required before production

- Short-lived access tokens with rotating refresh tokens in secure HttpOnly cookies.
- Password reset and verified contact flow.
- Role-based authorization beyond farmer ownership.
- Endpoint-specific abuse limits and account lockout policy.
- CSP and Subresource Integrity for frontend assets.
- Safe DOM rendering throughout the frontend.
- Audit logging, secret rotation, dependency scanning, and incident response.
- Restricted production CORS origins and managed secret storage.