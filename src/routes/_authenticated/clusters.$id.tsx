import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/clusters/$id")({ component: ClusterDetail });

interface Farmer { id: string; full_name: string; phone: string; opted_out: boolean }
interface Cluster { id: string; name: string; state: string; lga: string | null; lat: number; lng: number; crop_type: string | null }

function ClusterDetail() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("clusters").select("*").eq("id", id).single(),
      supabase.from("farmers").select("*").eq("cluster_id", id).order("created_at", { ascending: false }),
    ]);
    setCluster(c as Cluster | null);
    setFarmers((f ?? []) as Farmer[]);
  }
  useEffect(() => { load(); }, [id]);

  async function addFarmer(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const { error } = await supabase.from("farmers").insert({ cluster_id: id, full_name: name, phone });
    if (error) return setError(error.message);
    setName(""); setPhone(""); load();
  }

  async function toggle(f: Farmer) {
    await supabase.from("farmers").update({ opted_out: !f.opted_out }).eq("id", f.id);
    load();
  }

  if (!cluster) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <Link to="/clusters" className="text-sm text-muted-foreground underline">&larr; All clusters</Link>
      <div>
        <h1 className="text-2xl font-bold">{cluster.name}</h1>
        <div className="text-sm text-muted-foreground">{cluster.state}{cluster.lga ? ` · ${cluster.lga}` : ""} · {cluster.crop_type ?? "—"} · {cluster.lat.toFixed(3)}, {cluster.lng.toFixed(3)}</div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Farmers</h2>
        {isAdmin && (
          <form onSubmit={addFarmer} className="flex gap-2 mb-3">
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-3 py-2 border rounded-md bg-background text-sm" />
            <input required placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 px-3 py-2 border rounded-md bg-background text-sm" />
            <button className="bg-primary text-primary-foreground px-4 rounded-md text-sm">Add</button>
          </form>
        )}
        {error && <div className="text-sm text-destructive mb-2">{error}</div>}
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Status</th><th></th></tr></thead>
            <tbody>
              {farmers.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No farmers yet.</td></tr>}
              {farmers.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-3 py-2">{f.full_name}</td>
                  <td className="px-3 py-2 font-mono">{f.phone}</td>
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
