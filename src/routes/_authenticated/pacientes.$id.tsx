import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SessionRow, type SessionWithPatient } from "@/components/session-row";
import { useRole } from "@/hooks/use-role";
import { DEFAULT_RULES, brl, summarize } from "@/lib/clinic";
import { formatBrPhone } from "@/lib/phone";
import { rulesOf, useClinicSettings } from "@/hooks/use-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Pencil, Plus } from "lucide-react";
import { isValidBrPhone, maskBrPhone, toStoredPhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  head: () => ({ meta: [{ title: "Paciente — Sereno" }, { name: "description", content: "Ficha do paciente." }, { property: "og:title", content: "Paciente — Sereno" }, { property: "og:description", content: "Ficha do paciente." }] }),
  component: Paciente,
});

function Paciente() {
  const { id } = Route.useParams();
  const { data: me } = useRole();

  const { data: patient } = useQuery({
    queryKey: ["patients", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", "patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, starts_at, duration_min, price, status, payment_status, cancelled_at, patients(full_name, phone)")
        .eq("patient_id", id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as SessionWithPatient[];
    },
  });
  const { data: settings } = useClinicSettings();
  const { pendente } = summarize(sessions, settings ? rulesOf(settings) : DEFAULT_RULES);

  return (
    <div>
      <Link to="/pacientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Pacientes</Link>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-3xl">{patient?.full_name ?? "…"}</h1>
        {patient && <EditPatient patient={patient} />}
      </div>
      <p className="text-sm text-muted-foreground">
        {formatBrPhone(patient?.phone ?? "") || "sem telefone"}{patient?.phone_needs_review && " (revisar telefone)"} · sessão {brl(Number(patient?.default_price ?? 0))}
        {pendente > 0 && <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">deve {brl(pendente)}</span>}
      </p>

      {me?.role === "terapeuta" && <Notes patientId={id} />}

      <Packages patientId={id} />

      <h2 className="mt-8 text-xl">Sessões</h2>
      <div className="mt-3 space-y-3">
        {sessions.length === 0 ? <p className="text-muted-foreground">Nenhuma sessão ainda.</p> : sessions.map((s) => <SessionRow key={s.id} s={s} showDate />)}
      </div>
    </div>
  );
}

function Packages({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", total_sessions: "4", total_price: "", valid_days: "45" });
  const { data: packages = [] } = useQuery({
    queryKey: ["packages", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("patient_packages").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const days = Number(f.valid_days);
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      const { error } = await supabase.from("patient_packages").insert({
        patient_id: patientId,
        name: f.name.trim(),
        total_sessions: Number(f.total_sessions),
        total_price: Number(f.total_price) || 0,
        expires_on: days > 0 ? expires.toISOString().slice(0, 10) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pacote criado");
      setOpen(false);
      setF({ name: "", total_sessions: "4", total_price: "", valid_days: "45" });
      qc.invalidateQueries({ queryKey: ["packages", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (p: { id: string; active: boolean; starts_on: string; expires_on: string | null }) => {
      let patch: { active: boolean; used_sessions?: number; starts_on?: string; expires_on?: string | null } = { active: !p.active };
      if (!p.active) {
        // Reativar reinicia o ciclo: saldo zerado e validade recontada a partir de hoje.
        const today = new Date();
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        let expires: string | null = null;
        if (p.expires_on) {
          const days = Math.round((new Date(p.expires_on).getTime() - new Date(p.starts_on).getTime()) / 864e5);
          const e = new Date(today);
          e.setDate(e.getDate() + days);
          expires = iso(e);
        }
        patch = { active: true, used_sessions: 0, starts_on: iso(today), expires_on: expires };
      }
      const { error } = await supabase.from("patient_packages").update(patch).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packages", patientId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl"><Package className="h-4 w-4 text-primary" /> Pacotes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Pacote</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo pacote</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) add.mutate(); }}>
              <div className="space-y-1.5"><Label>Nome</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Pacote mensal" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Sessões</Label><Input type="number" min="1" required value={f.total_sessions} onChange={(e) => setF({ ...f, total_sessions: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Valor total (R$)</Label><Input type="number" min="0" step="0.01" value={f.total_price} onChange={(e) => setF({ ...f, total_price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Validade (dias)</Label><Input type="number" min="0" value={f.valid_days} onChange={(e) => setF({ ...f, valid_days: e.target.value })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">O saldo diminui sozinho a cada sessão marcada como realizada. Validade 0 = sem validade.</p>
              <Button type="submit" className="w-full" disabled={add.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-4 space-y-2">
        {packages.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pacote.</p>}
        {packages.map((p) => {
          const expired = p.expires_on && p.expires_on < new Date().toISOString().slice(0, 10);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
              <div>
                <div className="font-medium">{p.name}{!p.active && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">encerrado</span>}{expired && p.active && <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">vencido</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {p.used_sessions} de {p.total_sessions} sessões usadas · {brl(Number(p.total_price))}
                  {p.expires_on && ` · válido até ${new Date(p.expires_on + "T12:00:00").toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggle.mutate(p)}>{p.active ? "Encerrar" : "Reativar"}</Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Notes({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinical_notes").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clinical_notes").insert({ patient_id: patientId, content: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["notes", patientId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-xl"><Lock className="h-4 w-4 text-primary" /> Anotações clínicas</h2>
      <p className="text-xs text-muted-foreground">Visível só para a terapeuta.</p>
      <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate(); }}>
        <Textarea rows={3} placeholder="Evolução da sessão…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" size="sm" disabled={add.isPending}>Salvar anotação</Button>
      </form>
      <div className="mt-5 space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="border-l-2 border-sand pl-3">
            <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
            <p className="whitespace-pre-wrap text-sm">{n.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type PatientRow = { id: string; full_name: string; phone: string; email: string | null; birth_date: string | null; default_price: number; active: boolean };

function EditPatient({ patient }: { patient: PatientRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const init = () => ({
    full_name: patient.full_name,
    phone: maskBrPhone(patient.phone.replace(/^55/, "")),
    email: patient.email ?? "",
    birth_date: patient.birth_date ?? "",
    default_price: String(patient.default_price),
    active: patient.active,
  });
  const [f, setF] = useState(init);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients").update({
        full_name: f.full_name.trim(),
        phone: toStoredPhone(f.phone),
        phone_needs_review: false,
        email: f.email.trim() || null,
        birth_date: f.birth_date || null,
        default_price: Number(f.default_price),
        active: f.active,
      }).eq("id", patient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente atualizado");
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: "full_name" | "email" | "birth_date" | "default_price") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="h-4 w-4" /> Editar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar paciente</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (f.phone && !isValidBrPhone(f.phone)) { toast.error("Telefone inválido: use DDD + 8 dígitos (fixo) ou DDD + 9 + 8 dígitos (celular)."); return; } save.mutate(); }}>
          <div className="space-y-1.5"><Label>Nome completo</Label><Input required value={f.full_name} onChange={set("full_name")} /></div>
          <div className="space-y-1.5"><Label>WhatsApp</Label><Input inputMode="tel" placeholder="(84) 98643-8775" value={f.phone} onChange={(e) => setF({ ...f, phone: maskBrPhone(e.target.value) })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nascimento</Label><Input type="date" value={f.birth_date} onChange={set("birth_date")} /></div>
            <div className="space-y-1.5"><Label>Valor sessão (R$)</Label><Input type="number" min="0" step="0.01" value={f.default_price} onChange={set("default_price")} /></div>
          </div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Paciente ativo</label>
          <p className="text-xs text-muted-foreground">Mudar o valor vale para novas sessões; as já agendadas mantêm o valor original.</p>
          <Button type="submit" className="w-full" disabled={save.isPending}>Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
