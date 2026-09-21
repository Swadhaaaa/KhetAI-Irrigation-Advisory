-- Additive sensor ingestion foundation. Existing rows remain valid through
-- nullable metadata and safe defaults.
CREATE TYPE "SensorHealthStatus" AS ENUM(
    'UNKNOWN',
    'ONLINE',
    'STALE',
    'OFFLINE',
    'DEGRADED'
);

ALTER TABLE "SensorDevice"
ADD COLUMN "credentialHash" TEXT,
ADD COLUMN "credentialCreatedAt" TIMESTAMP(3),
ADD COLUMN "credentialRevokedAt" TIMESTAMP(3),
ADD COLUMN "healthStatus" "SensorHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "lastIngestedAt" TIMESTAMP(3),
ADD COLUMN "lastErrorCode" TEXT;

ALTER TABLE "SensorReading"
ADD COLUMN "qualityReason" TEXT,
ADD COLUMN "sensorType" TEXT,
ADD COLUMN "unit" TEXT,
ADD COLUMN "value" DECIMAL(12, 4),
ADD COLUMN "sourceEventId" TEXT,
ADD COLUMN "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "SensorReading_deviceId_ingestedAt_idx" ON "SensorReading" ("deviceId", "ingestedAt");