# Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                           │
│  - Tailwind UI, Leaflet maps                                         │
│  - Auth via supabase-js (session in localStorage)                    │
└────────────────────┬─────────────────────────────────────────────────┘
                     │  RPC over fetch (with bearer JWT)
                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  TanStack Start server (Cloudflare Workers)          │
│  - File-based routing under src/routes/                              │
│  - Public webhooks under /api/public/                                │
│  - Server-only files: *.server.ts (admin client + Twilio + OWM)      │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              ▼             ▼
       ┌────────────┐  ┌─────────────────────┐
       │  Supabase  │  │  External providers │
       │ Postgres + │  │  - OpenWeatherMap   │
       │ RLS + cron │  │  - Twilio SMS       │
       └────────────┘  └─────────────────────┘
```

## Cron flow (every 6 hours)

1. `pg_cron` posts to `/api/public/cron/check-weather` with `x-cron-secret` header.
2. Route handler validates secret and calls `runWeatherCheck()`.
3. For each cluster:
   - Fetch current weather → insert `weather_readings`.
   - Load matching `threshold_rules`, evaluate against rolling window.
   - If breached and not suppressed (no firing of the same rule in last 48h):
     - Insert `alert_event`.
     - For each non-opted-out farmer in cluster: send SMS via Twilio, log `alert_deliveries`.
4. Retry pass: re-send any `failed` deliveries with `attempts <= 1` and `next_retry_at <= now`.
5. Twilio status webhook (`/api/public/twilio/status`) updates delivery status as carriers report it.

## Security boundaries

- **Browser → DB**: only via Supabase publishable key, gated by RLS policies.
- **Server → DB**: admin client (service role key) only inside `*.server.ts` files reached by cron / webhooks.
- **Cron webhook**: shared-secret header.
- **Roles**: stored in dedicated `user_roles` table, checked via `has_role()` SECURITY DEFINER function — never trust client-side role flags.
