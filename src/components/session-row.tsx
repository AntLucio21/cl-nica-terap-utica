import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, brl, type SessionStatus } from "@/lib/clinic";
import { cn } from "@/lib/utils";

export type SessionWithPatient = {
  id: string;
  starts_at: string;
  duration_min: number;
  price: number;
  status: string;
  payment_status: string;
  patients: { full_name: string; phone: string } | null;
};

export function SessionRow({ s, showDate }: { s: SessionWithPatient; showDate?: boolean }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: async (patch: { status?: string; payment_status?: string; paid_at?: string | null }) => {
      const { error } = await supabase.from("sessions").update(patch).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const start = new Date(s.starts_at);
  const end = new Date(start.getTime() + s.duration_min * 60000);
  const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const paid = s.payment_status === "pago";

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center", s.status === "cancelada" && "opacity-60")}>
      <div className="min-w-24">
        {showDate && <div className="text-xs text-muted-foreground">{start.toLocaleDateString("pt-BR")}</div>}
        <div className="font-display text-lg">{fmt(start)}</div>
        <div className="text-xs text-muted-foreground">até {fmt(end)}</div>
      </div>
      <div className="flex-1">
        <div className="font-medium">{s.patients?.full_name ?? "—"}</div>
        <div className="text-sm text-muted-foreground">{brl(Number(s.price))}</div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={s.status} onValueChange={(v) => update.mutate({ status: v })}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as SessionStatus[]).map((k) => (
              <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={paid ? "default" : "outline"}
          className={cn(paid && "bg-success text-success-foreground hover:bg-success/90")}
          onClick={() =>
            update.mutate(paid ? { payment_status: "pendente", paid_at: null } : { payment_status: "pago", paid_at: new Date().toISOString() })
          }
        >
          {paid ? "Pago" : "Pendente"}
        </Button>
      </div>
    </div>
  );
}
