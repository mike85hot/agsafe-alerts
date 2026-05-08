import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Run {
  id: string; job_name: string; started_at: string; finished_at: string | null;
  clusters_checked: number; alerts_triggered: number; deliveries_queued: number;
  status: string; errors: unknown;
}

export const Route = createFileRoute("/_authenticated/cron")({ component: CronView });

function CronView() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("cron_runs").select("*").order("started_at", { ascending: false }).limit(50);
    setRuns((data ?? []) as Run[]);
  }
  useEffect(() => { load(); }, []);

  async function runNow() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/public/cron/check-weather", {
        method: "POST",
        headers: { "x-cron-secret": prompt("CRON_WEBHOOK_SECRET (one-time, for manual run):") ?? "" },
      });
      const data = await res.json();
      setMsg(res.ok ? `OK: checked ${data.clustersChecked}, triggered ${data.alertsTriggered}` : `Error: ${data.error}`);
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cron runs</h1>
        <button disabled={busy} onClick={runNow} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {busy ? "Running..." : "Run check now"}
        </button>
      </div>
      {msg && <div className="text-sm border rounded-md p-3 bg-muted">{msg}</div>}

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="px-3 py-2">Started</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Clusters</th><th className="px-3 py-2">Alerts</th><th className="px-3 py-2">Deliveries</th><th className="px-3 py-2">Errors</th></tr>
          </thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No runs yet.</td></tr>}
            {runs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.clusters_checked}</td>
                <td className="px-3 py-2">{r.alerts_triggered}</td>
                <td className="px-3 py-2">{r.deliveries_queued}</td>
                <td className="px-3 py-2 text-xs text-destructive max-w-sm truncate">{r.errors ? JSON.stringify(r.errors) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
