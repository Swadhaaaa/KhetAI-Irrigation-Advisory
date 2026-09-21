-- Support filtering sensor history by quality and ordering by measuredAt.
CREATE INDEX "SensorReading_plotId_quality_measuredAt_idx" ON "SensorReading" ("plotId", "quality", "measuredAt");
