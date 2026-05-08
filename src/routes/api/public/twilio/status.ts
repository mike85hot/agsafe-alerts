// Twilio status callback webhook. Updates alert_deliveries.status by MessageSid.
// Twilio signature verification is recommended; for MVP we trust by MessageSid + provider.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STATUS_MAP: Record<string, "sent" | "delivered" | "failed" | "undelivered"> = {
  sent: "sent",
  delivered: "delivered",
  failed: "failed",
  undelivered: "undelivered",
};

export const Route = createFileRoute("/api/public/twilio/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const sid = form.get("MessageSid")?.toString();
        const rawStatus = form.get("MessageStatus")?.toString() ?? "";
        const errorCode = form.get("ErrorCode")?.toString();
        if (!sid) return new Response("missing sid", { status: 400 });

        const mapped = STATUS_MAP[rawStatus];
        if (!mapped) return new Response("ok"); // ignore non-final statuses
        await supabaseAdmin
          .from("alert_deliveries")
          .update({
            status: mapped,
            delivered_at: mapped === "delivered" ? new Date().toISOString() : null,
            error: errorCode ? `Twilio code ${errorCode}` : null,
          })
          .eq("provider_message_id", sid);

        return new Response("ok");
      },
    },
  },
});
