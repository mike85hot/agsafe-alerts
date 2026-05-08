# AgSafe

Open-source climate early-warning platform that monitors hyperlocal weather for registered farm clusters and sends SMS alerts to smallholder farmers when drought, flood, or heat thresholds are breached.

Built for Sub-Saharan Africa. MIT licensed.

## Stack

- **Frontend & server**: TanStack Start (React 19) on Cloudflare Workers
- **Database / Auth**: Supabase (Postgres + Row-Level Security)
- **SMS**: Twilio REST API (modular — swap one file to use Africa's Talking, etc.)
- **Weather**: OpenWeatherMap (modular — swap one file for NiMet, satellite, etc.)
- **Maps**: Leaflet + OpenStreetMap (no API key required)
- **Cron**: Supabase `pg_cron` posting to a public webhook every 6 hours

## Roles

| Role          | Access                                                           |
| ------------- | ---------------------------------------------------------------- |
| `super_admin` | Full platform access; manage clusters, rules, view all alerts    |
| `field_agent` | Assigned clusters only; view alerts                              |
| `farmer`      | Own profile + alert history (default role on signup)             |

Roles live in the dedicated `user_roles` table and are checked via the `has_role()` SECURITY DEFINER function inside RLS policies — never on the profiles row.

## Local setup

1. Fork the repo and deploy on Lovable, or self-host on any Cloudflare Workers / Node-compat host.
2. Set environment variables (see `.env.example`):
   - `OPENWEATHERMAP_API_KEY`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
   - `CRON_WEBHOOK_SECRET` (any random string)
3. Configure the Supabase `pg_cron` job to hit `/api/public/cron/check-weather` every 6 hours (see `docs/deployment-guide.md`).
4. Sign up the first user, then promote them to `super_admin` in the database:
   ```sql
   INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'super_admin');
   ```

## Architecture

```
Browser ──► TanStack Start ──► Supabase (Postgres + RLS)
                │
                ├── /api/public/cron/check-weather  (called by pg_cron)
                │       │
                │       ▼
                │   runWeatherCheck()
                │   ├── WeatherProvider  → OpenWeatherMap
                │   ├── Threshold engine
                │   └── SmsProvider      → Twilio
                │
                └── /api/public/twilio/status      (delivery webhook)
```

See `docs/architecture.md` for details.

## Modular providers

- **Weather**: `src/lib/agsafe/weather.server.ts` — implement `WeatherProvider` and update `getWeatherProvider()`.
- **SMS**: `src/lib/agsafe/sms.server.ts` — implement `SmsProvider` and update `getSmsProvider()`.

## Threshold methodology

See `docs/threshold-methodology.md` for how each rule is calculated and how to adapt presets for a new country or region.

## Contributing

Fork it, change it, ship it for your community. PRs welcome — especially:
- New SMS provider implementations (Africa's Talking, Termii, MTN)
- Weather provider implementations (NiMet, CHIRPS satellite)
- Threshold preset packs for new regions
- Translations of SMS templates

## License

MIT — see `LICENSE`.
