-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'AGRONOMIST', 'FIELD_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DataProvenance" AS ENUM ('LIVE', 'SIMULATED', 'FALLBACK', 'IMPORTED');

-- CreateEnum
CREATE TYPE "AdvisoryStatus" AS ENUM ('GENERATED', 'ACKNOWLEDGED', 'OVERRIDDEN', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "village" TEXT,
    "taluk" TEXT,
    "district" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleLink" (
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleLink_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variety" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaAcres" DECIMAL(12,3) NOT NULL,
    "cropId" TEXT NOT NULL,
    "variety" TEXT,
    "plantingDate" DATE NOT NULL,
    "soilType" TEXT NOT NULL,
    "irrigationMethod" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoilProfile" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "fieldCapacity" DECIMAL(5,2),
    "wiltingPoint" DECIMAL(5,2),
    "infiltrationRate" DECIMAL(8,2),
    "source" TEXT,
    "version" TEXT,
    "measuredAt" TIMESTAMP(3),

    CONSTRAINT "SoilProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorDevice" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "name" TEXT,
    "firmware" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "batteryPct" DECIMAL(5,2),
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "calibration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "deviceId" TEXT,
    "eventKey" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "soilMoisture30" DECIMAL(5,2),
    "soilMoisture60" DECIMAL(5,2),
    "soilTemperature" DECIMAL(6,2),
    "ambientTemperature" DECIMAL(6,2),
    "humidityPct" DECIMAL(5,2),
    "rainfallMm" DECIMAL(8,2),
    "ndvi" DECIMAL(5,3),
    "batteryPct" DECIMAL(5,2),
    "quality" TEXT NOT NULL DEFAULT 'VALID',
    "provenance" "DataProvenance" NOT NULL,
    "rawPayload" JSONB,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "validAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatureMax" DECIMAL(65,30),
    "temperatureMin" DECIMAL(65,30),
    "humidityPct" DECIMAL(65,30),
    "rainfallMm" DECIMAL(65,30),
    "rainProbability" DECIMAL(65,30),
    "windSpeed" DECIMAL(65,30),
    "rawPayload" JSONB,
    "provenance" "DataProvenance" NOT NULL,

    CONSTRAINT "WeatherData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrrigationEvent" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "durationHours" DECIMAL(8,2) NOT NULL,
    "waterAppliedM3" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "source" TEXT NOT NULL DEFAULT 'FARMER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IrrigationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisory" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommendation" TEXT NOT NULL,
    "recommendedDate" DATE,
    "durationHours" DECIMAL(8,2),
    "waterVolumeM3" DECIMAL(12,2),
    "confidence" DECIMAL(5,2),
    "reasons" JSONB NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "modelVersion" TEXT,
    "status" "AdvisoryStatus" NOT NULL DEFAULT 'GENERATED',
    "farmerAction" TEXT,
    "outcome" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRead" (
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRead_pkey" PRIMARY KEY ("alertId","userId")
);

-- CreateTable
CREATE TABLE "FertilizerRecommendation" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "advisoryId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assumptions" JSONB NOT NULL,
    "quantities" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECOMMENDED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FertilizerRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YieldPrediction" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "predictedTPerHa" DECIMAL(65,30) NOT NULL,
    "lowTPerHa" DECIMAL(65,30) NOT NULL,
    "highTPerHa" DECIMAL(65,30) NOT NULL,
    "confidence" DECIMAL(65,30),
    "inputSnapshot" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "observedYieldTPerHa" DECIMAL(65,30),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YieldPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPrediction" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "advisoryId" TEXT,
    "predictionType" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DECIMAL(5,2),
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,

    CONSTRAINT "ModelPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE INDEX "UserRoleLink_role_idx" ON "UserRoleLink"("role");

-- CreateIndex
CREATE INDEX "Farm_ownerId_deletedAt_idx" ON "Farm"("ownerId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Crop_name_variety_key" ON "Crop"("name", "variety");

-- CreateIndex
CREATE INDEX "Plot_farmId_deletedAt_idx" ON "Plot"("farmId", "deletedAt");

-- CreateIndex
CREATE INDEX "Plot_plantingDate_idx" ON "Plot"("plantingDate");

-- CreateIndex
CREATE INDEX "SoilProfile_plotId_measuredAt_idx" ON "SoilProfile"("plotId", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SensorDevice_deviceKey_key" ON "SensorDevice"("deviceKey");

-- CreateIndex
CREATE INDEX "SensorDevice_plotId_isActive_idx" ON "SensorDevice"("plotId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SensorReading_eventKey_key" ON "SensorReading"("eventKey");

-- CreateIndex
CREATE INDEX "SensorReading_deviceId_measuredAt_idx" ON "SensorReading"("deviceId", "measuredAt");

-- CreateIndex
CREATE INDEX "SensorReading_plotId_measuredAt_idx" ON "SensorReading"("plotId", "measuredAt");

-- CreateIndex
CREATE INDEX "WeatherData_plotId_validAt_idx" ON "WeatherData"("plotId", "validAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherData_plotId_kind_provider_validAt_key" ON "WeatherData"("plotId", "kind", "provider", "validAt");

-- CreateIndex
CREATE UNIQUE INDEX "IrrigationEvent_eventKey_key" ON "IrrigationEvent"("eventKey");

-- CreateIndex
CREATE INDEX "IrrigationEvent_plotId_occurredAt_idx" ON "IrrigationEvent"("plotId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "IrrigationEvent_plotId_eventKey_key" ON "IrrigationEvent"("plotId", "eventKey");

-- CreateIndex
CREATE INDEX "Advisory_plotId_generatedAt_idx" ON "Advisory"("plotId", "generatedAt");

-- CreateIndex
CREATE INDEX "Alert_plotId_createdAt_idx" ON "Alert"("plotId", "createdAt");

-- CreateIndex
CREATE INDEX "FertilizerRecommendation_plotId_generatedAt_idx" ON "FertilizerRecommendation"("plotId", "generatedAt");

-- CreateIndex
CREATE INDEX "YieldPrediction_plotId_predictedAt_idx" ON "YieldPrediction"("plotId", "predictedAt");

-- CreateIndex
CREATE INDEX "ModelPrediction_plotId_predictionType_predictedAt_idx" ON "ModelPrediction"("plotId", "predictionType", "predictedAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_createdAt_idx" ON "AuditLog"("resource", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRoleLink" ADD CONSTRAINT "UserRoleLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoilProfile" ADD CONSTRAINT "SoilProfile_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorDevice" ADD CONSTRAINT "SensorDevice_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "SensorDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherData" ADD CONSTRAINT "WeatherData_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advisory" ADD CONSTRAINT "Advisory_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRead" ADD CONSTRAINT "AlertRead_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRead" ADD CONSTRAINT "AlertRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FertilizerRecommendation" ADD CONSTRAINT "FertilizerRecommendation_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FertilizerRecommendation" ADD CONSTRAINT "FertilizerRecommendation_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldPrediction" ADD CONSTRAINT "YieldPrediction_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPrediction" ADD CONSTRAINT "ModelPrediction_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPrediction" ADD CONSTRAINT "ModelPrediction_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
