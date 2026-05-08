import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Severity, ThresholdType } from "@/lib/agsafe/types";

interface Rule {
  id: string; cluster_id: string | null; state: string | null;
  type: ThresholdType; metric: string; value: number; window_hours: number;
  severity: Severity; template_en: string; language: string; active: boolean; is_preset: boolean;
}

const METRICS = ["rainfall_mm_total", "temp_max_c"];
const TYPES: ThresholdType[] = ["drought", "flood", "heat"];
const SEVERITIES: Severity[] = ["watch", "warning", "emergency"];

export const Route = createFileRoute("/_authenticated/rules")({ component: Rules });

function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("threshold_rules").select("*").order("is_preset", { ascending: false }).order("created_at");
    setRules((data ?? []) as Rule[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return; setError(null);
    const payload = {
      type: editing.type!, metric: editing.metric!, value: Number(editing.value),
      window_hours: Number(editing.window_hours), severity: editing.severity!,
      template_en: editing.template_en!, language: "en", active: editing.active ?? true,
      state: editing.state || null, cluster_id: null,
    };
    const { error } = editing.id
      ? await supabase.from("threshold_rules").update(payload).eq("id", editing.id)
      : await supabase.from("threshold_rules").insert(payload);
    if (error) return setError(error.message);
    setEditing(null); load();
  }

  async function toggleActive(r: Rule) {
    await supabase.from("threshold_rules").update({ active: !r.active }).eq("id", r.id);
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Threshold rules</h1>
        <button onClick={() => setEditing({ type: "drought", metric: "rainfall_mm_total", value: 20, window_hours: 336, severity: "warning", template_en: "AGSAFE WARNING: ...", active: true })}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">+ New rule</button>
      </div>

      {editing && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="grid sm:grid-cols-3 gap-3">
            <div><label className="text-xs">Type</label>
              <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as ThresholdType })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="text-xs">Metric</label>
              <select value={editing.metric} onChange={(e) => setEditing({ ...editing, metric: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm">
                {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select></div>
            <div><label className="text-xs">Severity</label>
              <select value={editing.severity} onChange={(e) => setEditing({ ...editing, severity: e.target.value as Severity })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm">
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="text-xs">Threshold value</label>
              <input type="number" value={editing.value ?? ""} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm" /></div>
            <div><label className="text-xs">Window (hours)</label>
              <input type="number" value={editing.window_hours ?? ""} onChange={(e) => setEditing({ ...editing, window_hours: Number(e.target.value) })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm" /></div>
            <div><label className="text-xs">State (optional, blank = all)</label>
              <input value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm" /></div>
          </div>
          <div>
            <label className="text-xs">SMS template (English) — {(editing.template_en ?? "").length}/160 chars</label>
            <textarea value={editing.template_en ?? ""} maxLength={160} rows={3}
              onChange={(e) => setEditing({ ...editing, template_en: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm font-mono" />
            {(editing.template_en ?? "").length > 160 && <div className="text-xs text-destructive">Over 160 characters will split into multiple SMS.</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">Save</button>
            <button onClick={() => setEditing(null)} className="border px-4 py-2 rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Threshold</th><th className="px-3 py-2">Window</th><th className="px-3 py-2">Severity</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Active</th><th></th></tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.type}{r.is_preset && <span className="text-xs text-muted-foreground ml-1">(preset)</span>}</td>
                <td className="px-3 py-2">{r.metric}</td>
                <td className="px-3 py-2">{r.value}</td>
                <td className="px-3 py-2">{r.window_hours}h</td>
                <td className="px-3 py-2">{r.severity}</td>
                <td className="px-3 py-2">{r.state ?? "Global"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleActive(r)} className={r.active ? "text-safe" : "text-destructive"}>
                    {r.active ? "On" : "Off"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right"><button onClick={() => setEditing(r)} className="text-xs underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
