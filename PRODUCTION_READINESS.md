# Production Readiness

| Category | Status | Evidence / remaining work |
|---|---|---|
| Security | PARTIAL | Helmet, CORS configuration, body limits, rate limiting, and validation added; token storage, CSP, RBAC, and abuse controls remain. |
| Database | PARTIAL | Runtime routes use Prisma/PostgreSQL; migration/import/verification passed, bounded queries and transaction safeguards added, and JSON remains preserved only for migration history. Dedicated integration DB, backups, and operational database monitoring remain. |
| Authentication | PARTIAL | bcrypt and JWT remain; secure refresh/session strategy and verification are missing. |
| Authorization | PARTIAL | Farmer plot ownership checks exist; role-based permissions are not implemented. |
| API | PARTIAL | Existing contracts preserved and smoke-tested; bounded pagination, request IDs, safe database error mapping, and readiness added. Versioning and broader idempotency remain. |
| Frontend | FAIL | Existing dashboard works, but unsafe interpolation, localStorage tokens, accessibility gaps, and stale-request races remain. |
| IoT | FAIL | Only a simulator exists; no authenticated device ingestion or health monitoring. |
| Weather | PARTIAL | Open-Meteo fallback exists; ingestion cache, provenance display, retries, and freshness storage remain. |
| AI/ML | PARTIAL | Transparent rule baseline exists; no trained model, evaluation dataset, or calibrated confidence. |
| Data quality | PARTIAL | Core request validation added; sensor quarantine, anomaly detection, and database constraints are pending migration. |
| Testing | PARTIAL | Four focused API tests pass and live PostgreSQL smoke tests pass; broader automated integration, migration rollback, and domain suites remain. |
| Monitoring | PARTIAL | Structured request/error logs, request IDs, latency, readiness, and graceful shutdown added; metrics, tracing, alerting, and external error monitoring remain. |
| Deployment | PARTIAL | Supabase migration is applied and local deployment commands are documented; hosted CI, backups, and staged rollout remain. |
| Backups | FAIL | Recovery runbook added, but Supabase backup configuration and restore drill are not verified. |
| Disaster recovery | FAIL | No documented restore drill, RPO/RTO, or rollback automation. |
| Documentation | PARTIAL | Audit and architecture/security/database/ML/IoT/deployment/testing documents added; operational runbooks remain. |

Critical items remain incomplete, so KhetAI must not be declared production-ready.