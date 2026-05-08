import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity, ThresholdType } from "@/lib/agsafe/types";

interface Row {
  id: string; cluster_id: string; type: ThresholdType; severity: Severity;
  message: string; triggered_at: string; cluster: string;
  reached: number; rate: number;
}

export const Route = createFileRoute("/_authenticated/alerts")({ component: Alerts });

function Alerts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filterType, setFilterType] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");

  async function load() {
    const { data: events } = await supabase.from("alert_events")
      .select("id, cluster_id, type, severity, message, triggered_at")
      .order("triggered_at", { ascending: false }).limit(500);
    const ids = (events ?? []).map((e) => e.id);
    const { data: clusters } = await supabase.from("clusters").select("id, name");
    const cMap = new Map((clusters ?? []).map((c) => [c.id, c.name]));
    const dCounts: Record<string, { total: number; ok: number }> = {};
    if (ids.length) {
      const { data: ds } = await supabase.from("alert_deliveries").select("alert_id, status").in("alert_id", ids);
      for (const d of ds ?? []) {
        const slot = (dCounts[d.alert_id] ??= { total: 0, ok: 0 });
        slot.total++;
        if (d.status === "sent" || d.status === "delivered") slot.ok++;
      }
    }
    setRows((events ?? []).map((e) => {
      const c = dCounts[e.id] ?? { total: 0, ok: 0 };
      return {
        id: e.id, cluster_id: e.cluster_id, type: e.type as ThresholdType,
        severity: e.severity as Severity, message: e.message, triggered_at: e.triggered_at,
        cluster: cMap.get(e.cluster_id) ?? "—",
        reached: c.total, rate: c.total ? Math.round((c.ok / c.total) * 100) : 0,
      };
    }));
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    (!filterType || r.type === filterType) &&
    (!filterSeverity || r.severity === filterSeverity)
  );

  function exportCsv() {
    const header = ["When", "Cluster", "Type", "Severity", "Farmers", "DeliveryRate", "Message"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const cells = [r.triggered_at, r.cluster, r.type, r.severity, r.reached, `${r.rate}%`, `"${r.message.replace(/"/g, '""')}"`];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agsafe-alerts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alert log</h1>
        <button onClick={exportCsv} className="border px-4 py-2 rounded-md text-sm">Export CSV</button>
      </div>

      <div className="flex gap-2">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border rounded-md bg-background text-sm">
          <option value="">All types</option><option>drought</option><option>flood</option><option>heat</option>
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 border rounded-md bg-background text-sm">
          <option value="">All severities</option><option>watch</option><option>warning</option><option>emergency</option>
        </select>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Cluster</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Farmers</th><th className="px-3 py-2">Delivered</th><th className="px-3 py-2">Message</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No alerts.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.triggered_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.cluster}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2"><SeverityBadge severity={r.severity} /></td>
                <td className="px-3 py-2">{r.reached}</td>
                <td className="px-3 py-2">{r.rate}%</td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-md">{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
