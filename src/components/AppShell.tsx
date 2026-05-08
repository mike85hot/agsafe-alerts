// Sidebar shell used by every authenticated screen.
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, MapPin, Sliders, Bell, Activity, LogOut, Sprout, User } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (a: { isAdmin: boolean; isAgent: boolean; isFarmer: boolean }) => boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { to: "/clusters", label: "Clusters", icon: MapPin, show: (a) => a.isAdmin || a.isAgent },
  { to: "/rules", label: "Threshold Rules", icon: Sliders, show: (a) => a.isAdmin },
  { to: "/alerts", label: "Alerts", icon: Bell, show: (a) => a.isAdmin || a.isAgent },
  { to: "/cron", label: "Cron Runs", icon: Activity, show: (a) => a.isAdmin },
  { to: "/me", label: "My Alerts", icon: User, show: (a) => a.isFarmer && !a.isAdmin && !a.isAgent },
];

export function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <Sprout className="h-6 w-6 text-safe" />
          <span className="font-bold text-lg tracking-tight">AgSafe</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          {NAV.filter((n) => n.show(auth)).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "bg-sidebar-accent" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-accent transition-colors"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="text-xs px-3 text-sidebar-foreground/70 truncate">{auth.user?.email}</div>
          <div className="text-xs px-3 text-sidebar-foreground/50">
            {auth.roles.join(", ") || "no role"}
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent text-sm"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-background overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
