import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Sprout, Bell, MapPin, Sliders } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight text-lg">AgSafe</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/login" className="hover:underline">Sign in</Link>
            <Link to="/signup" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90">Get started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Climate early warning for smallholder farmers.</h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          AgSafe monitors hyperlocal weather for registered farm clusters and sends SMS alerts to feature-phone farmers when drought, flood, or heat thresholds are breached. Open source. Built for Sub-Saharan Africa.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/signup" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:opacity-90">Start a deployment</Link>
          <a href="https://github.com" className="border px-6 py-3 rounded-md font-medium hover:bg-accent">View on GitHub</a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-6">
        {[
          { icon: MapPin, title: "Cluster registry", body: "Register farm clusters with GPS, crop type, and field agent assignment." },
          { icon: Sliders, title: "Threshold engine", body: "Drought, flood, and heat rules with per-cluster overrides and severity levels." },
          { icon: Bell, title: "SMS delivery", body: "Twilio-powered alerts with retry logic, delivery logs, and CSV export." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="border rounded-lg p-6">
            <Icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted-foreground">
          MIT licensed. AgSafe is an open-source climate resilience tool.
        </div>
      </footer>
    </div>
  );
}
