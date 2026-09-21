# Database Backup and Recovery

## Status

Supabase PostgreSQL is the runtime database. Backups and point-in-time recovery are not configured or verified by this repository. Do not treat `backend/data/db.json` as a production backup; it is a preserved migration fixture.

## Supabase capabilities

Supabase projects may provide platform-managed backups and, depending on plan and configuration, point-in-time recovery. The exact retention, recovery point objective (RPO), recovery time objective (RTO), and restore workflow must be confirmed in the Supabase project dashboard and plan documentation. This repository does not assume those features are enabled.

## What must be exported manually

- A logical PostgreSQL dump of the application schema and data.
- Prisma migration history and the exact deployed commit.
- Environment/configuration metadata without secrets.
- Notification/provider configuration and operational runbooks.
- A record of the last successful verification and migration status.

Never commit `DATABASE_URL`, passwords, JWT secrets, or dump files containing sensitive personal data.

## Recommended schedule

- Daily logical backup for development/staging data that matters.
- At least daily production backup, subject to the agreed RPO.
- Before every production migration and before destructive administrative changes.
- Periodically copy an encrypted backup to a separate recovery location.

## Recovery procedure

1. Declare the incident and freeze writes if possible.
2. Identify the target recovery point and confirm the backup is from the intended project/environment.
3. Restore into a separate Supabase project or isolated PostgreSQL instance first.
4. Apply the repository's Prisma migrations only when the restored schema requires them; do not blindly run migrations against an unknown restored state.
5. Run `npm run prisma:validate`, schema/status checks, JSON/row-count checks where applicable, and PostgreSQL integration tests against the isolated restore.
6. Run the documented smoke tests for authentication, ownership, plots, sensors, advisory, alerts, weather, fertigation, yield, and irrigation history.
7. Compare critical counts and sample records with the incident report.
8. Redirect traffic only after verification and stakeholder approval.
9. Preserve the original database and backup until recovery is accepted.

## Recovery verification

A recovery is not verified by a successful connection alone. Record:

- Migration status and schema version.
- Counts for users, farms, plots, readings, irrigation events, alerts, and advisories.
- Foreign-key and ownership checks.
- Authentication and cross-user authorization tests.
- API smoke-test results.
- Backup timestamp, restore timestamp, RPO, and RTO.

No backup, restore drill, RPO, or RTO is claimed as complete until it is executed and recorded for the deployed Supabase project.
