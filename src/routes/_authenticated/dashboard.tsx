import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MapView, type MapPin } from "@/components/MapView";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/agsafe/types";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, deliveryRate: 0 });
  const [pins, setPins] = useState<MapPin[]>([]);
  const [recent, setRecent] = useState<Array<{ id: string; cluster: string; type: string; severity: Severity; reached: number; rate: number; at: string }>>([]);

  // Send farmers to their personal page; they don't get the operations dashboard.
  useEffect(() => {
    if (!auth.loading && auth.isFarmer && !auth.isAdmin && !auth.isAgent) {
      navigate({ to: "/me" });
    }
  }, [auth.loading, auth.isFarmer, auth.isAdmin, auth.isAgent, navigate]);

  useEffect(() => {
    if (auth.loading) return;
    (async () => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 86400_000).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();

      const [{ count: today }, { count: week }, { count: month }, { data: deliveries }, { data: clusters }, { data: latestEvents }] = await Promise.all([
        supabase.from("alert_events").select("id", { count: "exact", head: true }).gte("triggered_at", dayAgo),
        supabase.from("alert_events").select("id", { count: "exact", head: true }).gte("triggered_at", weekAgo),
        supabase.from("alert_events").select("id", { count: "exact", head: true }).gte("triggered_at", monthAgo),
        supabase.from("alert_deliveries").select("status").gte("created_at", weekAgo),
        supabase.from("clusters").select("id, name, lat, lng, state"),
        supabase.from("alert_events").select("id, cluster_id, type, severity, triggered_at, message").order("triggered_at", { ascending: false }).limit(20),
      ]);

      const total = deliveries?.length ?? 0;
      const ok = deliveries?.filter((d) => d.status === "sent" || d.status === "delivered").length ?? 0;
      setStats({
        today: today ?? 0, week: week ?? 0, month: month ?? 0,
        deliveryRate: total ? Math.round((ok / total) * 100) : 0,
      });

      // Build map pins coloured by latest active alert per cluster (last 48h).
      const since = new Date(now.getTime() - 48 * 3600_000).toISOString();
      const { data: activeAlerts } = await supabase
        .from("alert_events").select("cluster_id, severity").gte("triggered_at", since);
      const byCluster = new Map<string, Severity>();
      for (const a of activeAlerts ?? []) {
        const order = { watch: 1, warning: 2, emergency: 3 } as const;
        const prev = byCluster.get(a.cluster_id);
        if (!prev || order[a.severity as Severity] > order[prev]) byCluster.set(a.cluster_id, a.severity as Severity);
      }
      setPins((clusters ?? []).map((c) => ({
        id: c.id, name: c.name, lat: c.lat, lng: c.lng,
        severity: byCluster.get(c.id) ?? "safe",
        meta: c.state,
      })));

      // Recent feed with delivery counts.
      const ids = (latestEvents ?? []).map((e) => e.id);
      const deliveryCounts: Record<string, { total: number; ok: number }> = {};
      if (ids.length) {
        const { data: ds } = await supabase.from("alert_deliveries").select("alert_id, status").in("alert_id", ids);
        for (const d of ds ?? []) {
          const slot = (deliveryCounts[d.alert_id] ??= { total: 0, ok: 0 });
          slot.total++;
          if (d.status === "sent" || d.status === "delivered") slot.ok++;
        }
      }
      const clusterMap = new Map((clusters ?? []).map((c) => [c.id, c.name]));
      setRecent((latestEvents ?? []).map((e) => {
        const c = deliveryCounts[e.id] ?? { total: 0, ok: 0 };
        return {
          id: e.id,
          cluster: clusterMap.get(e.cluster_id) ?? "—",
          type: e.type,
          severity: e.severity as Severity,
          reached: c.total,
          rate: c.total ? Math.round((c.ok / c.total) * 100) : 0,
          at: e.triggered_at,
        };
      }));
    })();
  }, [auth.loading]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Operations Dashboard</h1>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Alerts today", value: stats.today },
          { label: "This week", value: stats.week },
          { label: "This month", value: stats.month },
          { label: "Delivery rate (7d)", value: `${stats.deliveryRate}%` },
        ].map((s) => (
          <div key={s.label} className="border rounded-lg p-4 bg-card">
            <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
            <div className="text-3xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold mb-2">Cluster status map</h2>
        <MapView pins={pins} />
      </div>

      <div>
        <h2 className="font-semibold mb-2">Recent alerts</h2>
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Cluster</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Farmers</th>
                <th className="px-3 py-2">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No alerts yet.</td></tr>}
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.cluster}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2"><SeverityBadge severity={r.severity} /></td>
                  <td className="px-3 py-2">{r.reached}</td>
                  <td className="px-3 py-2">{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
