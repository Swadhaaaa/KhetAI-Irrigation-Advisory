# IoT Architecture

```mermaid
flowchart LR
  Sensor[ESP32/device] -->|MQTT or HTTPS| Gateway[Gateway/broker]
  Gateway --> Ingest[Authenticated ingestion API]
  Ingest --> Validate[Range, duplicate, timestamp, quality checks]
  Validate -->|valid| Readings[(sensor_readings)]
  Validate -->|invalid| Quarantine[(quarantine/raw events)]
  Readings --> Health[stale/offline/anomaly jobs]
  Readings --> Advisory[Decision engine]
```

The repository still uses `sensorSim.js` for development. Simulator output must be labeled `SIMULATED` and must never be presented as a physical-device observation.

Production ingestion needs device identity, credential rotation, event IDs, replay protection, calibration metadata, battery/connectivity state, offline buffering, quality flags, quarantine, and sensor health monitoring.