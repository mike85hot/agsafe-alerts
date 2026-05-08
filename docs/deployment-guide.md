# Deployment guide

## 1. Environment variables

Set these at the host level (Lovable, Cloudflare, Vercel, etc.):

- `OPENWEATHERMAP_API_KEY` — get one at https://openweathermap.org/api
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — Twilio console
- `CRON_WEBHOOK_SECRET` — any random ≥32-char string
- Supabase keys are auto-injected by Lovable Cloud; for self-hosted Supabase, set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Database

Run the migrations in `supabase/migrations/` (or apply via Supabase Studio).

## 3. Schedule the cron job

In the Supabase SQL editor, run (replacing `<URL>` and `<SECRET>`):

```sql
SELECT cron.schedule(
  'agsafe-check-weather',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-domain>/api/public/cron/check-weather',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_WEBHOOK_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Verify with:
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## 4. Configure Twilio status callback (optional but recommended)

In the Twilio console, set the messaging service status callback URL to:
```
https://<your-domain>/api/public/twilio/status
```

## 5. Promote first admin

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'you@example.com';
```

## 6. Manual run

Admins can hit the "Run check now" button on `/cron` and paste the secret to trigger an immediate check.
