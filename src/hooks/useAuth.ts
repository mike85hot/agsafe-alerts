// React hook giving the current Supabase session, profile and roles.
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/agsafe/types";

interface AuthState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, roles: [], loading: true });

  useEffect(() => {
    let mounted = true;

    // Subscribe FIRST (per Supabase guidance) then read existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setState((s) => ({ ...s, user, loading: false }));
      // Defer role lookup to avoid recursion in the listener.
      if (user) setTimeout(() => loadRoles(user.id), 0);
      else setState({ user: null, roles: [], loading: false });
    });

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      if (!mounted) return;
      setState((s) => ({ ...s, user, loading: false }));
      if (user) loadRoles(user.id);
    });

    async function loadRoles(uid: string) {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!mounted) return;
      setState((s) => ({ ...s, roles: (data?.map((r) => r.role) ?? []) as AppRole[] }));
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = state.roles.includes("super_admin");
  const isAgent = state.roles.includes("field_agent");
  const isFarmer = state.roles.includes("farmer");
  return { ...state, isAdmin, isAgent, isFarmer };
}
