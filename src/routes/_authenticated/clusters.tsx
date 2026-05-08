import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapView, type MapPin } from "@/components/MapView";

interface Cluster {
  id: string; name: string; state: string; lga: string | null;
  lat: number; lng: number; crop_type: string | null;
}

export const Route = createFileRoute("/_authenticated/clusters")({ component: Clusters });

function Clusters() {
  const { isAdmin } = useAuth();
  const [list, setList] = useState<Cluster[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", state: "", lga: "", lat: "", lng: "", crop_type: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("clusters").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Cluster[]);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const lat = parseFloat(form.lat), lng = parseFloat(form.lng);
    if (isNaN(lat) || isNaN(lng)) return setError("Lat/Lng must be numbers");
    const { error } = await supabase.from("clusters").insert({
      name: form.name, state: form.state, lga: form.lga || null,
      lat, lng, crop_type: form.crop_type || null,
    });
    if (error) return setError(error.message);
    setShowForm(false);
    setForm({ name: "", state: "", lga: "", lat: "", lng: "", crop_type: "" });
    load();
  }

  const pins: MapPin[] = list.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lng: c.lng, severity: "safe", meta: c.state }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Farm clusters</h1>
        {isAdmin && (
          <button onClick={() => setShowForm((s) => !s)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">
            {showForm ? "Cancel" : "+ New cluster"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={create} className="border rounded-lg p-4 bg-card grid sm:grid-cols-3 gap-3">
          {error && <div className="sm:col-span-3 text-sm text-destructive">{error}</div>}
          {[
            ["name", "Name"], ["state", "State"], ["lga", "LGA"],
            ["lat", "Latitude"], ["lng", "Longitude"], ["crop_type", "Crop type"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input required={k === "name" || k === "state" || k === "lat" || k === "lng"}
                value={form[k as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm" />
            </div>
          ))}
          <div className="sm:col-span-3">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">Create cluster</button>
          </div>
        </form>
      )}

      <MapView pins={pins} />

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">State</th><th className="px-3 py-2">LGA</th><th className="px-3 py-2">Crop</th><th className="px-3 py-2">Coords</th><th></th></tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No clusters yet.</td></tr>}
            {list.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.state}</td>
                <td className="px-3 py-2">{c.lga ?? "—"}</td>
                <td className="px-3 py-2">{c.crop_type ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{c.lat.toFixed(3)}, {c.lng.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">
                  <Link to="/clusters/$id" params={{ id: c.id }} className="text-primary underline text-sm">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
