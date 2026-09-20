# Deployment

## Development

```powershell
cd backend
npm install
npm test
npm start
```

The existing demo runs at `http://localhost:5000`. PostgreSQL can be started with `docker compose up -d postgres` after Docker is installed. The current workspace does not have Docker or `psql`, so migration application has not been executed here.

After PostgreSQL is available:

```powershell
docker compose up -d postgres
cd backend
npm run prisma:validate
npx prisma migrate deploy
npm run db:import-json
npm run db:verify
```

## Current hosted split

- Vercel serves the static frontend.
- Render serves the Node backend.
- `frontend/vercel.json` rewrites `/api/*` to the backend.

The rewrite hostname must be reconciled with the actual Render service before deployment; the audit found a mismatch between the rewrite and README/live-demo hostnames.

## Production requirements

Use managed PostgreSQL, protected environment variables, restricted CORS, HTTPS, database backups, migration gates, health/readiness checks, structured logs, metrics, error monitoring, staged deploys, and a tested rollback plan. Do not use `db.json` as durable production storage.