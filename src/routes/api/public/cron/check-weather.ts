// Public webhook called by Supabase pg_cron every 6 hours.
// Auth: requires header `x-cron-secret` matching CRON_WEBHOOK_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { runWeatherCheck } from "@/lib/agsafe/check.server";

export const Route = createFileRoute("/api/public/cron/check-weather")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret");
        const expected = process.env.CRON_WEBHOOK_SECRET;
        if (!expected || secret !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const summary = await runWeatherCheck();
          return Response.json({ ok: true, ...summary });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 }
          );
        }
      },
    },
  },
});
