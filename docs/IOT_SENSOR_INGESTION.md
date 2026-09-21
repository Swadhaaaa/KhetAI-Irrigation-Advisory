# KhetAI — IoT Sensor Data Ingestion & Pipeline Documentation

This document describes the production architecture, API contracts, data quality framework, security model, and device health monitoring for the KhetAI IoT sensor data ingestion pipeline.

---

## Architecture & Data Flow

```mermaid
flowchart LR
    subgraph Devices ["IoT Sensor Devices / Gateways"]
        D1["Field Sensor (ESP32/LoRa)"]
        D2["Cellular Gateway"]
        SIM["Development Simulator"]
    end

    subgraph API ["KhetAI Backend API"]
        AUTH["Device Auth Middleware\n(X-Device-Key / X-Device-Secret)"]
        VAL["Zod Payload Validation\n(sensorIngestionSchema)"]
        QUAL["Data Quality Engine\n(VALID / SUSPECT / INVALID)"]
        IDEM["Idempotency & Deduplication Engine"]
    end

    subgraph Storage ["PostgreSQL Database (Supabase)"]
        SD["SensorDevice Table"]
        SR["SensorReading Table"]
    end

    D1 -->|HTTP POST /api/iot/readings| AUTH
    D2 -->|HTTP POST /api/iot/readings| AUTH
    SIM -.->|Direct Repository Upsert\n(provenance: SIMULATED)| SR

    AUTH -->|Validate Device Credentials| SD
    AUTH --> VAL
    VAL --> QUAL
    QUAL --> IDEM
    IDEM -->|Insert Live Readings\n(provenance: LIVE)| SR
    IDEM -->|Update lastSeenAt / healthStatus| SD
```

---

## 1. Authentication Approach

IoT device authentication is completely decoupled from farmer JWT credentials:
- **Device Identifiers**: Every device has a unique `deviceKey` (public identifier).
- **Device Secret**: Devices transmit `X-Device-Key` and `X-Device-Secret` HTTP headers.
- **Hashing**: Device secrets are hashed using `bcrypt` (cost factor 12) and stored in `SensorDevice.credentialHash`.
- **Provisioning**: Authorized farmers provision/rotate credentials via `POST /api/iot/devices/:deviceId/credential`.
- **Revocation**: Setting `credentialRevokedAt` or `isActive = false` revokes device ingestion immediately.
- **Security Rule**: Secrets and tokens are NEVER logged in application server logs or standard request output.

---

## 2. Ingestion Endpoint & Request Schema

### Endpoint
`POST /api/iot/readings`

### Headers
```http
Content-Type: application/json
X-Device-Key: dev_key_demo_101
X-Device-Secret: sec_demo_secret_xyz123
```

### JSON Request Payload Schema
```json
{
  "eventId": "evt_20260921_001",
  "measuredAt": "2026-09-21T11:30:00.000Z",
  "batteryPct": 88.5,
  "firmware": "v1.4.2",
  "measurements": [
    {
      "type": "soil_moisture_30",
      "value": 34.2,
      "unit": "percent"
    },
    {
      "type": "soil_temperature",
      "value": 26.8,
      "unit": "C"
    },
    {
      "type": "ambient_temperature",
      "value": 31.5,
      "unit": "C"
    },
    {
      "type": "humidity",
      "value": 62.0,
      "unit": "percent"
    }
  ]
}
```

### Response (HTTP 202 Accepted)
```json
{
  "accepted": 4,
  "duplicates": 0,
  "quality": {
    "VALID": 4,
    "SUSPECT": 0,
    "INVALID": 0
  },
  "deviceId": "dev_clx101",
  "plotId": "plt_clx555"
}
```

---

## 3. Physical Ranges & Data Quality Classification

| Measurement Type | Supported Unit | Min | Max | Target Database Field |
| :--- | :--- | :--- | :--- | :--- |
| `soil_moisture_30` | `percent` | 0 | 100 | `soilMoisture30` |
| `soil_moisture_60` | `percent` | 0 | 100 | `soilMoisture60` |
| `soil_temperature` | `C` | -20 | 80 | `soilTemperature` |
| `ambient_temperature` | `C` | -40 | 80 | `ambientTemperature` |
| `humidity` | `percent` | 0 | 100 | `humidityPct` |
| `rainfall` | `mm` | 0 | 500 | `rainfallMm` |
| `ndvi` | `unitless` | -1.0 | 1.0 | `ndvi` |

### Classification Rules

1. **`VALID`**:
   - Measurement value is within the physical operating range.
   - Timestamp clock skew is within +5 minutes of server time and age is ≤ 30 days.
2. **`SUSPECT`**:
   - Measurement value is within range.
   - Timestamp is older than 30 days (up to 365 days).
3. **`INVALID`**:
   - Measurement value is outside physical operating bounds (e.g. soil moisture 150%, temperature 95°C).
   - Timestamp is older than 365 days.
   - **Important**: Questionable/invalid readings are NOT silently dropped. They are stored with `quality: "INVALID"` and a descriptive `qualityReason` (e.g. `out_of_range_soil_moisture_30`) so they can be audited.
4. **Malformed / Clock Skew Rejection (HTTP 400)**:
   - Unsupported sensor type or unit mismatch (e.g., `rainfall` with unit `percent`).
   - Timestamps > 5 minutes in the future (clock skew limit).

---

## 4. Idempotency & Duplicate Prevention

- **Source Event Key**: Ingestion creates a unique `sourceEventId = "${eventId}:${sensorType}"` and unique database `eventKey = "device-${deviceId}-${sourceEventId}"`.
- **Exact Duplicate Re-submission**: Resubmitting the same `eventId` with identical values is idempotent. The API returns HTTP 202 with `duplicates: N` without inserting redundant database rows.
- **Event ID Conflict Rejection (HTTP 409)**: Reusing an `eventId` with different measurement data or timestamp is rejected with `DUPLICATE_READING_CONFLICT`.

---

## 5. Device Health Monitoring

Device health status is calculated dynamically based on activity and battery telemetry:

- **`ONLINE`**: `lastSeenAt` within the last 24 hours and all ingested measurements are valid.
- **`STALE`**: `lastSeenAt` is between 24 hours and 7 days old.
- **`OFFLINE`**: `lastSeenAt` is older than 7 days, or device is inactive/unprovisioned.
- **`DEGRADED`**: Battery percentage < 15% or recent invalid sensor readings detected.
- **`UNKNOWN`**: Device created but has not reported telemetry yet.

Farmers can inspect device health via `GET /api/iot/devices/health?plotId=...`.

---

## 6. Simulated Data vs. Real Device Data

| Attribute | Simulated Telemetry | Real Production Device Telemetry |
| :--- | :--- | :--- |
| **Data Provenance** | `SIMULATED` | `LIVE` |
| **Device Identifier** | `legacy-device-{plotId}` | Provisioned device ID (e.g. `dev_cuid...`) |
| **Authentication** | Bypasses HTTP network auth (internal background sim) | HTTP headers (`X-Device-Key`, `X-Device-Secret`) |
| **Simulator Role** | Active in development/demo mode to ensure fresh daily readings | Ignored by production device pipelines |

---

## 7. Security & Hardening Controls

1. **Authentication**: Device key + bcrypt-hashed secret per device.
2. **Authorization**: Devices are bound strictly to active plots owned by active farmers (`deletedAt IS NULL`).
3. **Payload Sanitization**: Zod limits payload array size (1–16 measurements per event) and enforces type bounds.
4. **Rate Limiting**: Ingestion endpoint protected by `express-rate-limit` (120 requests / 15 mins per device/IP).
5. **Secret Protection**: Device secrets and tokens are never written to application logs.

---

## 8. Future Hardware Connectivity Guide

To connect physical IoT hardware (e.g. ESP32, Arduino, LoRaWAN Gateway):
- **HTTP/REST Direct**: Send POST requests to `/api/iot/readings` with `X-Device-Key` and `X-Device-Secret` headers.
- **MQTT Gateway**: Deploy an MQTT broker (e.g., EMQX or Mosquitto) that bridges MQTT telemetry topics to `POST /api/iot/readings`.
- **LoRaWAN (The Things Network / ChirpStack)**: Configure an HTTP webhook integration pointing to `/api/iot/readings` with custom payload formatters.
