import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGE_LABEL, type Language } from "@/lib/agsafe/types";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/clusters/$id")({ component: ClusterDetail });

interface Farmer { id: string; full_name: string; phone: string; opted_out: boolean; language: Language }
interface Cluster { id: string; name: string; state: string; lga: string | null; lat: number; lng: number; crop_type: string | null }
interface Reading { fetched_at: string; temp_c: number | null; temp_max_c: number | null; rainfall_mm: number | null }

// Aggregates raw readings into per-day buckets for charting.
function bucketByDay(readings: Reading[]) {
  const byDay = new Map<string, { day: string; tempMax: number; tempMin: number; rain: number; count: number }>();
  for (const r of readings) {
    const day = r.fetched_at.slice(0, 10);
    const t = Number(r.temp_max_c ?? r.temp_c ?? NaN);
    const rain = Number(r.rainfall_mm ?? 0);
    const cur = byDay.get(day) ?? { day, tempMax: -Infinity, tempMin: Infinity, rain: 0, count: 0 };
    if (Number.isFinite(t)) {
      cur.tempMax = Math.max(cur.tempMax, t);
      cur.tempMin = Math.min(cur.tempMin, t);
    }
    cur.rain += rain;
    cur.count++;
    byDay.set(day, cur);
  }
  return Array.from(byDay.values())
    .map((d) => ({
      day: d.day.slice(5),
      tempMax: Number.isFinite(d.tempMax) ? Number(d.tempMax.toFixed(1)) : null,
      tempMin: Number.isFinite(d.tempMin) ? Number(d.tempMin.toFixed(1)) : null,
      rain: Number(d.rain.toFixed(1)),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function ClusterDetail() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const [{ data: c }, { data: f }, { data: w }] = await Promise.all([
      supabase.from("clusters").select("*").eq("id", id).single(),
      supabase.from("farmers").select("*").eq("cluster_id", id).order("created_at", { ascending: false }),
      supabase.from("weather_readings").select("fetched_at,temp_c,temp_max_c,rainfall_mm")
        .eq("cluster_id", id).gte("fetched_at", since).order("fetched_at", { ascending: true }),
    ]);
    setCluster(c as Cluster | null);
    setFarmers((f ?? []) as Farmer[]);
    setReadings((w ?? []) as Reading[]);
  }
  useEffect(() => { load(); }, [id]);

  async function addFarmer(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const { error } = await supabase.from("farmers").insert({ cluster_id: id, full_name: name, phone, language });
    if (error) return setError(error.message);
    setName(""); setPhone(""); setLanguage("en"); load();
  }

  async function toggle(f: Farmer) {
    await supabase.from("farmers").update({ opted_out: !f.opted_out }).eq("id", f.id);
    load();
  }

  async function setFarmerLang(f: Farmer, lang: Language) {
    await supabase.from("farmers").update({ language: lang }).eq("id", f.id);
    load();
  }

  const chartData = useMemo(() => bucketByDay(readings), [readings]);

  if (!cluster) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <Link to="/clusters" className="text-sm text-muted-foreground underline">&larr; All clusters</Link>
      <div>
        <h1 className="text-2xl font-bold">{cluster.name}</h1>
        <div className="text-sm text-muted-foreground">{cluster.state}{cluster.lga ? ` · ${cluster.lga}` : ""} · {cluster.crop_type ?? "—"} · {cluster.lat.toFixed(3)}, {cluster.lng.toFixed(3)}</div>
      </div>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="border rounded-lg bg-card p-4">
          <h2 className="font-semibold mb-2 text-sm">Temperature (last 30 days, °C)</h2>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No readings yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tempMax" name="Max" stroke="hsl(var(--destructive))" dot={false} />
                <Line type="monotone" dataKey="tempMin" name="Min" stroke="hsl(var(--primary))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="border rounded-lg bg-card p-4">
          <h2 className="font-semibold mb-2 text-sm">Rainfall (last 30 days, mm)</h2>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No readings yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="rain" name="Rain mm" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Farmers</h2>
        {isAdmin && (
          <form onSubmit={addFarmer} className="flex flex-wrap gap-2 mb-3">
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-40 px-3 py-2 border rounded-md bg-background text-sm" />
            <input required placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 min-w-40 px-3 py-2 border rounded-md bg-background text-sm" />
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="px-3 py-2 border rounded-md bg-background text-sm">
              {(Object.keys(LANGUAGE_LABEL) as Language[]).map((l) => (
                <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>
              ))}
            </select>
            <button className="bg-primary text-primary-foreground px-4 rounded-md text-sm">Add</button>
          </form>
        )}
        {error && <div className="text-sm text-destructive mb-2">{error}</div>}
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Language</th><th className="px-3 py-2">Status</th><th></th></tr></thead>
            <tbody>
              {farmers.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No farmers yet.</td></tr>}
              {farmers.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-3 py-2">{f.full_name}</td>
                  <td className="px-3 py-2 font-mono">{f.phone}</td>
                  <td className="px-3 py-2">
                    {isAdmin ? (
                      <select value={f.language ?? "en"} onChange={(e) => setFarmerLang(f, e.target.value as Language)} className="px-1.5 py-1 border rounded bg-background text-xs">
                        {(Object.keys(LANGUAGE_LABEL) as Language[]).map((l) => (
                          <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>
                        ))}
                      </select>
                    ) : LANGUAGE_LABEL[f.language ?? "en"]}
                  </td>
                  <td className="px-3 py-2">{f.opted_out ? <span className="text-destructive">Opted out</span> : <span className="text-safe">Active</span>}</td>
                  <td className="px-3 py-2 text-right">
                    {isAdmin && <button onClick={() => toggle(f)} className="text-xs underline">{f.opted_out ? "Re-enable" : "Opt out"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
