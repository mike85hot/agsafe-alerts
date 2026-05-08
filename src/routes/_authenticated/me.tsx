import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/agsafe/types";

export const Route = createFileRoute("/_authenticated/me")({ component: MyAlerts });

function MyAlerts() {
  const auth = useAuth();
  const [phone, setPhone] = useState("");
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: Severity; type: string; message: string; sent_at: string | null }>>([]);

  useEffect(() => {
    if (!auth.user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("phone").eq("user_id", auth.user!.id).single();
      setPhone(profile?.phone ?? "");
      const { data: ds } = await supabase
        .from("alert_deliveries")
        .select("id, sent_at, alert_id")
        .order("created_at", { ascending: false }).limit(50);
      const ids = (ds ?? []).map((d) => d.alert_id);
      if (ids.length === 0) return setAlerts([]);
      const { data: events } = await supabase.from("alert_events").select("id, severity, type, message").in("id", ids);
      const m = new Map(events?.map((e) => [e.id, e]) ?? []);
      setAlerts((ds ?? []).map((d) => {
        const e = m.get(d.alert_id);
        return { id: d.id, severity: (e?.severity ?? "watch") as Severity, type: e?.type ?? "", message: e?.message ?? "", sent_at: d.sent_at };
      }));
    })();
  }, [auth.user]);

  async function savePhone() {
    if (!auth.user) return;
    await supabase.from("profiles").update({ phone }).eq("user_id", auth.user.id);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">My AgSafe</h1>
      <div className="border rounded-lg p-4 bg-card">
        <label className="text-sm font-medium">Your phone number</label>
        <div className="flex gap-2 mt-1">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 px-3 py-2 border rounded-md bg-background" />
          <button onClick={savePhone} className="bg-primary text-primary-foreground px-4 rounded-md text-sm">Save</button>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">My alerts</h2>
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Message</th></tr></thead>
            <tbody>
              {alerts.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No alerts yet.</td></tr>}
              {alerts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-2">{a.sent_at ? new Date(a.sent_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-3 py-2">{a.type}</td>
                  <td className="px-3 py-2 text-xs">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
