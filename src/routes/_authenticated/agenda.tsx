import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SessionRow, type SessionWithPatient } from "@/components/session-row";
import { SESSION_DEFAULTS, clinicDateTime } from "@/lib/clinic";
import { useClinicSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Sereno" }, { name: "description", content: "Agenda de sessões da clínica." }, { property: "og:title", content: "Agenda — Sereno" }, { property: "og:description", content: "Agenda de sessões da clínica." }] }),
  component: Agenda,
});

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Agenda() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const weekStart = addDays(day, -((day.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions", "day", day.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, starts_at, duration_min, price, status, payment_status, cancelled_at, patients(full_name, phone)")
        .gte("starts_at", day.toISOString())
        .lt("starts_at", addDays(day, 1).toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as SessionWithPatient[];
    },
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl capitalize">
            {day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </h1>
          <p className="text-sm text-muted-foreground">{sessions.length} sessão(ões)</p>
        </div>
        <NewSession defaultDate={day} />
      </div>

      <div className="mt-5 flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setDay(addDays(day, -7))} aria-label="Semana anterior"><ChevronLeft /></Button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((d) => {
            const sel = d.getTime() === day.getTime();
            return (
              <button
                key={d.toISOString()}
                onClick={() => setDay(d)}
                className={cn("rounded-xl py-2 text-center transition-colors", sel ? "bg-deep text-deep-foreground" : "hover:bg-secondary")}
              >
                <div className="text-[10px] uppercase opacity-70">{d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}</div>
                <div className="font-display text-lg">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDay(addDays(day, 7))} aria-label="Próxima semana"><ChevronRight /></Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Nenhuma sessão neste dia.</div>
        ) : (
          sessions.map((s) => <SessionRow key={s.id} s={s} />)
        )}
      </div>
    </div>
  );
}

function NewSession({ defaultDate }: { defaultDate: Date }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(toInputDate(defaultDate));
  const [time, setTime] = useState("09:00");
  const [price, setPrice] = useState(String(SESSION_DEFAULTS.price));
  const { data: settings } = useClinicSettings();
  const durationMin = settings?.defaultDurationMin ?? SESSION_DEFAULTS.durationMin;

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id, full_name, default_price").eq("active", true).order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Horários de atendimento do dia escolhido (a equipe toda pode ler; o banco bloqueia de qualquer forma).
  const weekday = ((clinicDateTime(date, "12:00").getDay() + 6) % 7) + 1; // 1=seg … 7=dom
  const { data: dayHours = [] } = useQuery({
    queryKey: ["clinic-hours", weekday],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_hours").select("start_time, end_time").eq("weekday", weekday).order("start_time");
      if (error) return [];
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const startsAt = clinicDateTime(date, time);
      const { error } = await supabase.from("sessions").insert({
        patient_id: patientId,
        starts_at: startsAt.toISOString(),
        duration_min: durationMin,
        price: Number(price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sessão agendada");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setDate(toInputDate(defaultDate)); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Sessão</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova sessão</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (!patientId) { toast.error("Escolha o paciente"); return; } create.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Select
              value={patientId}
              onValueChange={(v) => {
                setPatientId(v);
                const p = patients.find((x) => x.id === v);
                setPrice(String(p?.default_price ?? settings?.defaultPrice ?? SESSION_DEFAULTS.price));
              }}
            >
              <SelectTrigger><SelectValue placeholder={patients.length ? "Selecione" : "Cadastre um paciente primeiro"} /></SelectTrigger>
              <SelectContent>
                {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Horário</Label><Input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">
            Duração: {durationMin} min.
            {dayHours.length > 0
              ? ` Atendimento neste dia: ${dayHours.map((h) => `${h.start_time.slice(0, 5)}–${h.end_time.slice(0, 5)}`).join(" e ")}.`
              : " Sem horário de atendimento cadastrado para este dia — a sessão pode ser recusada."}
          </p>
          <Button type="submit" className="w-full" disabled={create.isPending}>Agendar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
