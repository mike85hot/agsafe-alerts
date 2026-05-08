import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name, phone },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border rounded-lg p-6 bg-card">
        <h1 className="text-2xl font-bold">Create your AgSafe account</h1>
        <p className="text-sm text-muted-foreground">By default new accounts are farmer-level. An admin can elevate your role.</p>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div><label className="text-sm">Full name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md bg-background" /></div>
        <div><label className="text-sm">Phone (E.164, e.g. +234...)</label>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md bg-background" /></div>
        <div><label className="text-sm">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md bg-background" /></div>
        <div><label className="text-sm">Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md bg-background" /></div>
        <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium disabled:opacity-50">
          {busy ? "Creating..." : "Create account"}
        </button>
        <div className="text-sm text-center">
          Have an account? <Link to="/login" className="underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
