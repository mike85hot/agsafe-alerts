import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border rounded-lg p-6 bg-card">
        <h1 className="text-2xl font-bold">Sign in to AgSafe</h1>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md bg-background" />
        </div>
        <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium disabled:opacity-50">
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-sm text-center">
          New here? <Link to="/signup" className="underline">Create an account</Link>
        </div>
      </form>
    </div>
  );
}
