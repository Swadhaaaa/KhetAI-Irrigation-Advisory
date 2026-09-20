# Production Readiness

| Category | Status | Evidence / remaining work |
|---|---|---|
| Security | PARTIAL | Helmet, CORS configuration, body limits, rate limiting, and validation added; token storage, CSP, RBAC, and abuse controls remain. |
| Database | PARTIAL | Prisma 7 schema/client, versioned initial SQL, transactional import, and verification scripts added; PostgreSQL was not available to apply or test the migration, and JSON is still active. |
| Authentication | PARTIAL | bcrypt and JWT remain; secure refresh/session strategy and verification are missing. |
| Authorization | PARTIAL | Farmer plot ownership checks exist; role-based permissions are not implemented. |
| API | PARTIAL | Existing contracts preserved and key writes validated; pagination, versioning, idempotency, and full error policy remain. |
| Frontend | FAIL | Existing dashboard works, but unsafe interpolation, localStorage tokens, accessibility gaps, and stale-request races remain. |
| IoT | FAIL | Only a simulator exists; no authenticated device ingestion or health monitoring. |
| Weather | PARTIAL | Open-Meteo fallback exists; ingestion cache, provenance display, retries, and freshness storage remain. |
| AI/ML | PARTIAL | Transparent rule baseline exists; no trained model, evaluation dataset, or calibrated confidence. |
| Data quality | PARTIAL | Core request validation added; sensor quarantine, anomaly detection, and database constraints are pending migration. |
| Testing | PARTIAL | Four focused API tests previously passed and Prisma client generation passes; PostgreSQL integration, migration rollback, and broad domain suites remain blocked by unavailable PostgreSQL. |
| Monitoring | FAIL | No structured metrics, tracing, request IDs, alerting, or error monitoring. |
| Deployment | PARTIAL | Local Docker database configuration and migration commands documented; Docker is unavailable in the current environment, and hosted database/CI configuration remains. |
| Backups | FAIL | JSON and hosted filesystem are not a durable backup strategy. |
| Disaster recovery | FAIL | No documented restore drill, RPO/RTO, or rollback automation. |
| Documentation | PARTIAL | Audit and architecture/security/database/ML/IoT/deployment/testing documents added; operational runbooks remain. |

Critical items remain incomplete, so KhetAI must not be declared production-ready.