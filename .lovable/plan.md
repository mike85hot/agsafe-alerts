
# AgSafe — v1 Plan

A climate early-warning system that monitors weather for registered farm clusters and sends SMS alerts to farmers when thresholds are breached. Built on Lovable's stack (TanStack Start + Lovable Cloud), with Twilio via the managed connector and OpenWeatherMap + Mapbox via secrets. Cron via Supabase pg_cron hitting a public webhook.

## Scope (v1: MVP + Dashboards)

**In:**
- Auth + 3 roles (super_admin, field_agent, farmer)
- Farm cluster registry (manual entry + Mapbox map view)
- Threshold rule engine with default presets + per-cluster overrides
- Weather monitoring server function (called by pg_cron every 6h)
- Alert delivery via Twilio (with retry once after 30 min)
- Real-time alert dashboard with map + recent feed + filters
- Searchable alert log with CSV export
- Farmer read-only view (own alerts + current weather)
- README + threshold-methodology.md + .env.example

**Out (deferred to v2):**
- Africa's Talking fallback
- CSV bulk import of clusters
- 30-day weather history charts
- Multi-language SMS templates (UI field exists, but only English wired)
- Field agent follow-up workflow

## User Roles

Stored in a separate `user_roles` table (never on profiles), checked via `has_role()` SECURITY DEFINER function in RLS policies.

- **super_admin** — full access
- **field_agent** — read-only on assigned clusters + alerts
- **farmer** — read-only on own record + alerts

## Database Schema (Lovable Cloud)

```text
profiles            (id, full_name, phone, created_at)
user_roles          (id, user_id, role enum)
clusters            (id, name, state, lga, lat, lng, crop_type,
                     field_agent_id, created_by, created_at)
farmers             (id, cluster_id, full_name, phone, opted_out bool)
threshold_rules     (id, cluster_id nullable, state nullable,
                     type enum[drought,flood,heat], metric, value,
                     window_hours, severity enum[watch,warning,emergency],
                     template_en, language, active bool)
weather_readings    (id, cluster_id, temp_c, rainfall_mm, raw jsonb, fetched_at)
alert_events        (id, cluster_id, rule_id, severity, message,
                     triggered_at, suppressed bool)
alert_deliveries    (id, alert_id, farmer_id, phone, status enum,
                     provider, twilio_sid, error, attempts, sent_at)
cron_runs           (id, started_at, finished_at, clusters_checked,
                     alerts_triggered, errors jsonb)
```

RLS: every table enabled. `has_role(auth.uid(), 'super_admin')` for full access; field_agent scoped via `clusters.field_agent_id = auth.uid()`; farmer scoped via `farmers.user_id = auth.uid()` (linked at signup by phone).

## Server Functions (`createServerFn`)

- `clusters.functions.ts` — CRUD + list with map data
- `farmers.functions.ts` — CRUD per cluster
- `rules.functions.ts` — CRUD + seed default presets
- `alerts.functions.ts` — list, filter, CSV export
- `weather.functions.ts` — `runWeatherCheck()` (callable manually too)
- `dashboard.functions.ts` — aggregate stats

## Public API Routes (`src/routes/api/public/`)

- `POST /api/public/cron/check-weather` — header-secret-protected; invokes `runWeatherCheck()`. Called by pg_cron every 6h.
- `POST /api/public/twilio/status` — Twilio delivery status webhook (signature verified) → updates `alert_deliveries.status`.

## Modular Connectors

- `src/lib/weather/provider.ts` — `WeatherProvider` interface; `openWeatherMap.ts` implements it. Swap one file to use NiMet.
- `src/lib/sms/provider.ts` — `SmsProvider` interface; `twilio.ts` implements it via the Lovable Twilio connector gateway. Adding Africa's Talking later = one new file.

## Weather Check Logic

1. Load active clusters
2. For each: fetch OWM current + recent rainfall, store in `weather_readings`
3. Evaluate matching active `threshold_rules`
4. For each breach: check 48h suppression window → insert `alert_event` → fan out to all non-opted-out farmers in cluster → call SMS provider, log `alert_deliveries`
5. On Twilio failure: schedule retry (mark attempts=1, retry via next cron pass after 30m)
6. Write `cron_runs` summary

Default presets seeded on first admin login:
- Drought: <20mm over 14 days
- Flood: >80mm in 48h
- Heat: >38°C for 5 consecutive days

## Frontend Routes

```text
/                              landing + login CTA
/login, /signup
/_authenticated/
  dashboard                    role-aware redirect
  admin/
    clusters                   table + Mapbox map
    clusters/$id               detail + farmers + cluster rules
    rules                      global rules + presets editor
    alerts                     log + filters + CSV export
    cron                       last runs, manual "Run check now"
  agent/
    clusters                   assigned only
    alerts
  farmer/
    me                         my alerts + current weather
```

UI: dark sidebar, white content, semantic color tokens for severity (green/yellow/orange/red defined in `src/styles.css`). Tailwind utilities only. Mobile responsive.

## Integrations Setup (during build)

1. Connect Twilio via `standard_connectors--connect`
2. Prompt for `OPENWEATHERMAP_API_KEY`, `MAPBOX_PUBLIC_TOKEN` (VITE_), `CRON_WEBHOOK_SECRET` via secrets tool
3. Migration creates pg_cron job hitting the public cron webhook every 6h with the secret header

## Build Order

1. Schema + RLS + roles + auth + role-aware redirect
2. Cluster registry (CRUD + Mapbox map)
3. Farmers CRUD (manual; CSV import deferred)
4. Threshold rule engine + presets seeding + character counter
5. Weather provider module + `runWeatherCheck` server fn + cron_runs logging
6. SMS provider module (Twilio gateway) + alert delivery + retry
7. Public cron webhook + pg_cron migration + Twilio status webhook
8. Admin dashboard (stats + map + recent feed)
9. Alert log with filters + CSV export
10. Field agent + farmer views
11. README, .env.example, docs/threshold-methodology.md, docs/architecture.md

## Notes / Trade-offs

- **No Express/Docker/separate repo.** Codebase is TanStack Start; docs explain architecture for forks. If you need a literal Node/Express monorepo, this is the wrong tool.
- **Cron** runs in Lovable Cloud (Supabase pg_cron). Forks self-hosting elsewhere can swap in any HTTP scheduler — webhook contract is documented.
- **Twilio via connector** means no raw account SID/token in your repo; gateway handles auth. Forks can wire their own Twilio creds by replacing `src/lib/sms/twilio.ts` with a direct-API version (template provided in docs).
- **Farmer login**: phone-based auth via Lovable Cloud Phone OTP, linked to `farmers.phone`. Optional — most farmers will only receive SMS, never log in.
- **160-char SMS limit** enforced in template editor with live counter.

