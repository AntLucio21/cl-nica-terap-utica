import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useClinicSettings, type ClinicSettings } from "@/hooks/use-settings";
import { CLINIC_TZ, clinicDateTime } from "@/lib/clinic";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Sereno" },
      { name: "description", content: "Configurações da clínica: preços, agenda, mensagens e consultório." },
      { property: "og:title", content: "Configurações — Sereno" },
      { property: "og:description", content: "Configurações da clínica: preços, agenda, mensagens e consultório." },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.role !== "terapeuta") throw redirect({ to: "/agenda" });
  },
  component: Configuracoes,
});

const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const METHODS = [
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "cartao", label: "Cartão" },
  { id: "transferencia", label: "Transferência" },
] as const;

function Configuracoes() {
  const { data: settings } = useClinicSettings();
  if (!settings) return <p className="text-muted-foreground">Carregando…</p>;
  return (
    <div className="space-y-8">
      <h1 className="text-2xl">Configurações</h1>
      <p className="-mt-6 text-sm text-muted-foreground">Só a terapeuta vê e altera esta área — no sistema e no banco de dados.</p>
      <GeneralForm settings={settings} />
      <HoursEditor />
      <BlocksEditor />
    </div>
  );
}

function GeneralForm({ settings }: { settings: ClinicSettings }) {
  const qc = useQueryClient();
  const [f, setF] = useState(settings);
  useEffect(() => setF(settings), [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clinic_settings")
        .update({
          default_price: Number(f.defaultPrice),
          default_duration_min: Number(f.defaultDurationMin),
          interval_min: Number(f.intervalMin),
          reminder_hours_before: Number(f.reminderHoursBefore),
          cancel_notice_hours: Number(f.cancelNoticeHours),
          cancel_charge_pct: Number(f.cancelChargePct),
          no_show_charge_pct: Number(f.noShowChargePct),
          payment_methods: f.paymentMethods,
          pix_key: f.pixKey.trim(),
          clinic_name: f.clinicName.trim(),
          clinic_phone: f.clinicPhone.trim(),
          logo_url: f.logoUrl.trim(),
          reception_can_see_financials: f.receptionCanSeeFinancials,
          reminder_template: f.reminderTemplate,
          billing_template: f.billingTemplate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["clinic-settings"] });
      qc.invalidateQueries({ queryKey: ["reception-financials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const num = (k: keyof ClinicSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const txt = (k: keyof ClinicSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg">Consultório</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Nome do consultório</Label><Input value={f.clinicName} onChange={txt("clinicName")} /></div>
          <div className="space-y-1.5"><Label>Telefone do consultório</Label><Input value={f.clinicPhone} onChange={txt("clinicPhone")} placeholder="(84) 99999-0000" /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Logo (endereço da imagem)</Label>
          <Input value={f.logoUrl} onChange={txt("logoUrl")} placeholder="https://…" />
          {f.logoUrl && <img src={f.logoUrl} alt="Logo do consultório" className="mt-2 h-12 rounded-lg object-contain" />}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg">Financeiro e cobrança</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Valor padrão da sessão (R$)</Label><Input type="number" min="0" step="0.01" value={f.defaultPrice} onChange={num("defaultPrice")} /></div>
          <div className="space-y-1.5"><Label>Cobrar falta (% do valor)</Label><Input type="number" min="0" max="100" value={f.noShowChargePct} onChange={num("noShowChargePct")} /></div>
          <div className="space-y-1.5"><Label>Cancelamento sem custo até (horas antes)</Label><Input type="number" min="0" value={f.cancelNoticeHours} onChange={num("cancelNoticeHours")} /></div>
        </div>
        <div className="space-y-1.5 sm:max-w-xs">
          <Label>Cancelamento em cima da hora cobra (% do valor)</Label>
          <Input type="number" min="0" max="100" value={f.cancelChargePct} onChange={num("cancelChargePct")} />
          <p className="text-xs text-muted-foreground">0 = não cobra; 100 = valor integral. Vale para cancelamentos feitos com menos de {f.cancelNoticeHours}h de antecedência.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Formas de pagamento aceitas</Label>
          <div className="flex flex-wrap gap-4 pt-1">
            {METHODS.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.paymentMethods.includes(m.id)}
                  onChange={(e) =>
                    setF({ ...f, paymentMethods: e.target.checked ? [...f.paymentMethods, m.id] : f.paymentMethods.filter((x) => x !== m.id) })
                  }
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 sm:max-w-md"><Label>Chave Pix (aparece nos lembretes de cobrança)</Label><Input value={f.pixKey} onChange={txt("pixKey")} /></div>
        <label className="flex items-center justify-between rounded-xl border p-4 text-sm">
          <span><b>Recepção pode ver valores financeiros</b><br /><span className="text-muted-foreground">Desligado, a recepção não acessa a tela Financeiro.</span></span>
          <Switch checked={f.receptionCanSeeFinancials} onCheckedChange={(v) => setF({ ...f, receptionCanSeeFinancials: v })} />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg">Agenda</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Duração padrão da sessão (min)</Label><Input type="number" min="15" step="5" value={f.defaultDurationMin} onChange={num("defaultDurationMin")} /></div>
          <div className="space-y-1.5"><Label>Intervalo entre sessões (min)</Label><Input type="number" min="0" step="5" value={f.intervalMin} onChange={num("intervalMin")} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Os horários de atendimento e os bloqueios (férias, feriados) ficam logo abaixo.</p>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg">Comunicação</h2>
        <div className="space-y-1.5 sm:max-w-xs"><Label>Enviar lembrete (horas antes da sessão)</Label><Input type="number" min="1" value={f.reminderHoursBefore} onChange={num("reminderHoursBefore")} /></div>
        <div className="space-y-1.5">
          <Label>Modelo: lembrete de sessão</Label>
          <Textarea rows={3} value={f.reminderTemplate} onChange={txt("reminderTemplate")} />
          <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"}, {"{horario}"}, {"{data}"}</p>
        </div>
        <div className="space-y-1.5">
          <Label>Modelo: cobrança pendente</Label>
          <Textarea rows={3} value={f.billingTemplate} onChange={txt("billingTemplate")} />
          <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"}, {"{data}"}, {"{valor}"}, {"{pix}"}</p>
        </div>
      </section>

      <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar configurações"}</Button>
    </form>
  );
}

function HoursEditor() {
  const qc = useQueryClient();
  const { data: hours = [] } = useQuery({
    queryKey: ["clinic-hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_hours").select("*").order("weekday").order("start_time");
      if (error) throw error;
      return data;
    },
  });
  const [draft, setDraft] = useState<Record<number, { start: string; end: string }>>({});

  const add = useMutation({
    mutationFn: async (weekday: number) => {
      const d = draft[weekday];
      if (!d?.start || !d?.end) throw new Error("Preencha início e fim.");
      const { error } = await supabase.from("clinic_hours").insert({ weekday, start_time: d.start, end_time: d.end });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-hours"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinic_hours").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-hours"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-lg">Horário de atendimento</h2>
      <p className="text-xs text-muted-foreground">A agenda bloqueia sessões fora destes horários. Para intervalo de almoço, cadastre dois períodos no mesmo dia (ex.: 8h–12h e 14h–18h). Enquanto nada for cadastrado, qualquer horário é aceito.</p>
      <div className="space-y-3">
        {WEEKDAYS.map((label, i) => {
          const weekday = i + 1;
          const ranges = hours.filter((h) => h.weekday === weekday);
          const d = draft[weekday] ?? { start: "", end: "" };
          return (
            <div key={weekday} className="rounded-xl border p-3">
              <div className="text-sm font-medium">{label}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {ranges.map((r) => (
                  <span key={r.id} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                    {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                    <button aria-label={`Remover horário de ${label}`} className="text-muted-foreground hover:text-destructive" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
                {ranges.length === 0 && <span className="text-xs text-muted-foreground">fechado</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input type="time" className="w-28" value={d.start} onChange={(e) => setDraft({ ...draft, [weekday]: { ...d, start: e.target.value } })} />
                <span className="text-xs text-muted-foreground">até</span>
                <Input type="time" className="w-28" value={d.end} onChange={(e) => setDraft({ ...draft, [weekday]: { ...d, end: e.target.value } })} />
                <Button type="button" size="sm" variant="outline" onClick={() => add.mutate(weekday)} disabled={add.isPending}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BlocksEditor() {
  const qc = useQueryClient();
  const { data: blocks = [] } = useQuery({
    queryKey: ["clinic-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_blocks").select("*").order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState({ from: "", to: "", reason: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!f.from || !f.to) throw new Error("Preencha início e fim.");
      const { error } = await supabase.from("clinic_blocks").insert({
        starts_at: clinicDateTime(f.from, "00:00").toISOString(),
        ends_at: clinicDateTime(f.to, "23:59").toISOString(),
        reason: f.reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setF({ from: "", to: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["clinic-blocks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinic_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-blocks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: CLINIC_TZ });

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-lg">Bloqueios pontuais</h2>
      <p className="text-xs text-muted-foreground">Férias, feriados e congressos: a agenda recusa sessões nesses períodos.</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Motivo</Label><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Férias" /></div>
        <Button type="button" variant="outline" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /> Bloquear</Button>
      </div>
      <ul className="divide-y">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center justify-between py-2 text-sm">
            <span>{fmt(b.starts_at)} → {fmt(b.ends_at)}{b.reason && <span className="text-muted-foreground"> · {b.reason}</span>}</span>
            <button aria-label="Remover bloqueio" className="text-muted-foreground hover:text-destructive" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {blocks.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</li>}
      </ul>
    </section>
  );
}
