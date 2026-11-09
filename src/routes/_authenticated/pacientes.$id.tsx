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
import { brl, summarize } from "@/lib/clinic";

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
        .select("id, starts_at, duration_min, price, status, payment_status, patients(full_name, phone)")
        .eq("patient_id", id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as SessionWithPatient[];
    },
  });
  const { pendente } = summarize(sessions);

  return (
    <div>
      <Link to="/pacientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Pacientes</Link>
      <h1 className="mt-3 text-3xl">{patient?.full_name ?? "…"}</h1>
      <p className="text-sm text-muted-foreground">
        {patient?.phone || "sem telefone"} · sessão {brl(Number(patient?.default_price ?? 0))}
        {pendente > 0 && <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">deve {brl(pendente)}</span>}
      </p>

      {me?.role === "terapeuta" && <Notes patientId={id} />}

      <h2 className="mt-8 text-xl">Sessões</h2>
      <div className="mt-3 space-y-3">
        {sessions.length === 0 ? <p className="text-muted-foreground">Nenhuma sessão ainda.</p> : sessions.map((s) => <SessionRow key={s.id} s={s} showDate />)}
      </div>
    </div>
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
