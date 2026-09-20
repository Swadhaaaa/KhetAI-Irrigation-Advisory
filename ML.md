# Agricultural Intelligence and ML Policy

The current irrigation advisory, fertigation guidance, and yield prediction are deterministic formulas and heuristics. They are not trained machine-learning models and must be labeled accordingly in product copy.

## Baseline inputs

- Crop age and growth stage
- Crop coefficient (`Kc`)
- Simplified reference evapotranspiration (`ET0`)
- Soil type, field capacity, and wilting point
- Soil moisture
- Forecast rainfall
- Plot area

## ML introduction gate

ML should begin only after collecting timestamped sensor data, weather data, irrigation events, and observed yields with quality and provenance fields. Each model needs a versioned feature contract, time-aware train/validation/test split, baseline comparison, calibration, drift monitoring, rollback, and agronomist review.

No accuracy or confidence claim should be published until measured on a held-out field dataset. Confidence for the current rules must be described as a rule-based status, not model probability.