# Threshold methodology

AgSafe alerts are triggered by **threshold rules** evaluated against rolling windows of weather readings stored per farm cluster.

## Rule shape

| Field         | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `type`        | `drought` / `flood` / `heat` — used for grouping in UI and reports      |
| `metric`      | The aggregate computed across the window (see below)                    |
| `value`       | The numeric threshold compared against the aggregate                    |
| `window_hours`| How far back the engine aggregates readings                             |
| `severity`    | `watch` / `warning` / `emergency` — drives UI colour and SMS prefix     |
| `state`       | If set, rule only applies to clusters in that state (else: global)      |
| `cluster_id`  | If set, rule only applies to that cluster (overrides global)            |

## Supported metrics

### `rainfall_mm_total`
Sums the `rainfall_mm` field across all `weather_readings` for the cluster within `window_hours`.

- For **drought** rules, the rule fires when the total is **less than** `value`.
- For **flood** rules, the rule fires when the total is **greater than** `value`.

### `temp_max_c`
Takes the maximum of `temp_max_c` (falling back to `temp_c`) across the window. Fires when greater than `value`. Used for heat rules.

## Default presets

| Type    | Metric              | Value | Window     | Severity   |
| ------- | ------------------- | ----- | ---------- | ---------- |
| Drought | rainfall_mm_total   | 20mm  | 14 days    | warning    |
| Flood   | rainfall_mm_total   | 80mm  | 48 hours   | emergency  |
| Heat    | temp_max_c          | 38°C  | 5 days     | warning    |

These map to the most common climatic risks for Sub-Saharan smallholder maize, sorghum, and millet farming. Adapt the values for your local agronomy:
- For coastal / high-rainfall regions, raise the flood threshold (e.g., 120mm/48h).
- For Sahel / arid regions, raise the heat threshold (e.g., 42°C).
- For perennial crops, extend the drought window to 30 days.

## Suppression

To avoid alert fatigue, the engine **suppresses duplicate alerts** for the same `(cluster, rule)` pair within 48 hours of the previous trigger.

## Adding a new metric

1. Add a `case` branch to `evaluateRule()` in `src/lib/agsafe/check.server.ts`.
2. Make sure the `WeatherProvider` populates whatever raw field the metric needs.
3. Optionally extend the `metric` dropdown in `src/routes/_authenticated/rules.tsx`.

That's it — no schema changes required for the rule itself, since `metric` is a free-text column.

## Adapting to a new country

1. Replace the seed presets in the migration (or create new ones via the UI).
2. Translate the SMS templates into local languages (UI fields exist for Hausa, Yoruba, Pidgin; add more by extending `threshold_rules`).
3. Swap `WeatherProvider` for a national met agency feed if available — they tend to be more accurate for hyperlocal forecasting than global APIs.
