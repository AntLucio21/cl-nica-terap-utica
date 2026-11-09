import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Users, Wallet, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

const NAV = [
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
] as const;

function Layout() {
  const { data } = useRole();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <span className="font-display text-xl text-primary">Sereno</span>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  path.startsWith(n.to) && "bg-secondary text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
              {data?.role === "terapeuta" ? "Terapeuta" : data?.role === "secretaria" ? "Recepção" : "…"}
            </span>
            <button onClick={signOut} aria-label="Sair" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-card md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground",
              path.startsWith(n.to) && "text-primary",
            )}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
