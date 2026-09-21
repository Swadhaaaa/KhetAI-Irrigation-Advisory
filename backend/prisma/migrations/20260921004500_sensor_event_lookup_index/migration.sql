-- Support device/event idempotency lookups in the ingestion transaction.
CREATE INDEX "SensorReading_deviceId_sourceEventId_idx" ON "SensorReading" ("deviceId", "sourceEventId");