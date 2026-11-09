import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionRow, type SessionWithPatient } from "@/components/session-row";
import { brl, summarize } from "@/lib/clinic";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Sereno" }, { name: "description", content: "Controle de sessões pagas e pendentes." }, { property: "og:title", content: "Financeiro — Sereno" }, { property: "og:description", content: "Controle de sessões pagas e pendentes." }] }),
  component: Financeiro,
});

function Financeiro() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [filter, setFilter] = useState<"todos" | "pendente" | "pago">("pendente");
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", "month", month.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, starts_at, duration_min, price, status, payment_status, patients(full_name, phone)")
        .gte("starts_at", month.toISOString())
        .lt("starts_at", next.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as SessionWithPatient[];
    },
  });

  const { recebido, pendente } = summarize(sessions);
  const list = sessions.filter((s) => s.status !== "cancelada" && (filter === "todos" || s.payment_status === filter));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl capitalize">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h1>
        <div className="flex">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(next)}><ChevronRight /></Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-deep p-5 text-deep-foreground">
          <div className="text-sm opacity-80">Recebido</div>
          <div className="mt-1 font-display text-2xl md:text-3xl">{brl(recebido)}</div>
        </div>
        <div className="rounded-2xl bg-accent p-5 text-accent-foreground">
          <div className="text-sm opacity-80">A receber</div>
          <div className="mt-1 font-display text-2xl md:text-3xl">{brl(pendente)}</div>
        </div>
      </div>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mt-6">
        <TabsList>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="pago">Pagos</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4 space-y-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Nada por aqui.</div>
        ) : (
          list.map((s) => <SessionRow key={s.id} s={s} showDate />)
        )}
      </div>
    </div>
  );
}
