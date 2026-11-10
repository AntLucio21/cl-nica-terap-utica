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
import { Package, Plus } from "lucide-react";

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
      <h1 className="mt-3 text-3xl">{patient?.full_name ?? "…"}</h1>
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
    mutationFn: async (p: { id: string; active: boolean }) => {
      const { error } = await supabase.from("patient_packages").update({ active: !p.active }).eq("id", p.id);
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
