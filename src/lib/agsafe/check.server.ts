// Core weather-check engine. Called by the cron webhook (every 6h) or manually by an admin.
// SECURITY: server-only. Uses the admin client to write across all clusters.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getWeatherProvider } from "./weather.server";
import { sendSmsWithFallback } from "./sms.server";
import type { Language } from "./types";

// Picks the SMS body in the farmer's preferred language, falling back to English.
function pickTemplate(
  rule: { template_en: string; template_ha: string | null; template_yo: string | null; template_pcm: string | null },
  lang: Language,
): string {
  if (lang === "ha" && rule.template_ha) return rule.template_ha;
  if (lang === "yo" && rule.template_yo) return rule.template_yo;
  if (lang === "pcm" && rule.template_pcm) return rule.template_pcm;
  return rule.template_en;
}

const SUPPRESSION_HOURS = 48;

interface CheckSummary {
  clustersChecked: number;
  alertsTriggered: number;
  deliveriesQueued: number;
  errors: { cluster?: string; message: string }[];
}

// Evaluate all active clusters, fetch weather, evaluate rules, send alerts.
export async function runWeatherCheck(): Promise<CheckSummary> {
  const errors: CheckSummary["errors"] = [];
  let clustersChecked = 0;
  let alertsTriggered = 0;
  let deliveriesQueued = 0;

  // Open a cron_runs row to make this run visible in the admin dashboard.
  const { data: run } = await supabaseAdmin
    .from("cron_runs")
    .insert({ job_name: "check_weather", status: "running" })
    .select("id")
    .single();

  const weather = getWeatherProvider();
  const sms = getSmsProvider();

  const { data: clusters, error: clustersErr } = await supabaseAdmin
    .from("clusters")
    .select("*");
  if (clustersErr) {
    errors.push({ message: `Failed to load clusters: ${clustersErr.message}` });
  }

  for (const cluster of clusters ?? []) {
    clustersChecked++;
    try {
      // 1. Fetch current weather + persist a reading.
      const reading = await weather.fetch(cluster.lat, cluster.lng);
      await supabaseAdmin.from("weather_readings").insert({
        cluster_id: cluster.id,
        temp_c: reading.tempC,
        temp_max_c: reading.tempMaxC,
        rainfall_mm: reading.rainfallMm,
        humidity: reading.humidity,
        wind_speed: reading.windSpeed,
        raw: reading.raw as never,
      });

      // 2. Load applicable threshold rules: cluster-specific OR global/state-level.
      const { data: rules } = await supabaseAdmin
        .from("threshold_rules")
        .select("*")
        .eq("active", true)
        .or(`cluster_id.eq.${cluster.id},cluster_id.is.null`);

      for (const rule of rules ?? []) {
        // State scoping: skip if rule restricts a state that doesn't match.
        if (rule.state && rule.state !== cluster.state) continue;

        // Aggregate readings within the rule's window.
        const sinceIso = new Date(Date.now() - rule.window_hours * 3600_000).toISOString();
        const { data: history } = await supabaseAdmin
          .from("weather_readings")
          .select("temp_c, temp_max_c, rainfall_mm")
          .eq("cluster_id", cluster.id)
          .gte("fetched_at", sinceIso);

        const breached = evaluateRule(rule.metric, Number(rule.value), rule.type, history ?? []);
        if (!breached.triggered) continue;

        // 3. Suppression check — skip if same rule fired in last 48h for this cluster.
        const supSince = new Date(Date.now() - SUPPRESSION_HOURS * 3600_000).toISOString();
        const { data: recent } = await supabaseAdmin
          .from("alert_events")
          .select("id")
          .eq("cluster_id", cluster.id)
          .eq("rule_id", rule.id)
          .eq("suppressed", false)
          .gte("triggered_at", supSince)
          .limit(1);
        if (recent && recent.length > 0) continue;

        // 4. Insert alert event.
        const { data: event, error: evErr } = await supabaseAdmin
          .from("alert_events")
          .insert({
            cluster_id: cluster.id,
            rule_id: rule.id,
            type: rule.type,
            severity: rule.severity,
            message: rule.template_en,
            metric_value: breached.value,
          })
          .select("id")
          .single();
        if (evErr || !event) {
          errors.push({ cluster: cluster.name, message: `Insert alert failed: ${evErr?.message}` });
          continue;
        }
        alertsTriggered++;

        // 5. Fan out to farmers in this cluster (skip opted-out).
        const { data: farmers } = await supabaseAdmin
          .from("farmers")
          .select("id, phone")
          .eq("cluster_id", cluster.id)
          .eq("opted_out", false);

        for (const farmer of farmers ?? []) {
          const result = await sms.send(farmer.phone, rule.template_en);
          deliveriesQueued++;
          await supabaseAdmin.from("alert_deliveries").insert({
            alert_id: event.id,
            farmer_id: farmer.id,
            phone: farmer.phone,
            status: result.success ? "sent" : "failed",
            provider: sms.name,
            provider_message_id: result.providerMessageId ?? null,
            error: result.error ?? null,
            attempts: 1,
            sent_at: result.success ? new Date().toISOString() : null,
            next_retry_at: result.success ? null : new Date(Date.now() + 30 * 60_000).toISOString(),
          });
        }
      }
    } catch (e) {
      errors.push({ cluster: cluster.name, message: e instanceof Error ? e.message : String(e) });
    }
  }

  // Retry pass: re-send any failed deliveries whose next_retry_at <= now and attempts == 1.
  const { data: retries } = await supabaseAdmin
    .from("alert_deliveries")
    .select("id, phone, alert_id, attempts")
    .eq("status", "failed")
    .lte("attempts", 1)
    .lte("next_retry_at", new Date().toISOString());

  for (const d of retries ?? []) {
    const { data: ev } = await supabaseAdmin
      .from("alert_events").select("message").eq("id", d.alert_id).single();
    if (!ev) continue;
    const result = await sms.send(d.phone, ev.message);
    await supabaseAdmin.from("alert_deliveries").update({
      status: result.success ? "sent" : "failed",
      provider_message_id: result.providerMessageId ?? null,
      error: result.error ?? null,
      attempts: (d.attempts ?? 1) + 1,
      sent_at: result.success ? new Date().toISOString() : null,
      next_retry_at: null,
    }).eq("id", d.id);
  }

  if (run) {
    await supabaseAdmin.from("cron_runs").update({
      finished_at: new Date().toISOString(),
      clusters_checked: clustersChecked,
      alerts_triggered: alertsTriggered,
      deliveries_queued: deliveriesQueued,
      errors: errors.length > 0 ? errors : null,
      status: errors.length > 0 ? "completed_with_errors" : "completed",
    }).eq("id", run.id);
  }

  return { clustersChecked, alertsTriggered, deliveriesQueued, errors };
}

// Evaluate a single rule against a window of weather readings.
function evaluateRule(
  metric: string,
  threshold: number,
  type: "drought" | "flood" | "heat",
  history: { temp_c: number | null; temp_max_c: number | null; rainfall_mm: number | null }[]
): { triggered: boolean; value: number } {
  if (metric === "rainfall_mm_total") {
    const total = history.reduce((s, r) => s + (Number(r.rainfall_mm) || 0), 0);
    if (type === "drought") return { triggered: total < threshold, value: total };
    return { triggered: total > threshold, value: total };
  }
  if (metric === "temp_max_c") {
    const max = history.reduce((m, r) => Math.max(m, Number(r.temp_max_c ?? r.temp_c ?? -Infinity)), -Infinity);
    return { triggered: max > threshold, value: Number.isFinite(max) ? max : 0 };
  }
  return { triggered: false, value: 0 };
}
