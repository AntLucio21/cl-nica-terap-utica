import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_DEFAULTS } from "@/lib/clinic";
import { formatBrPhone, isValidBrPhone, maskBrPhone, toStoredPhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  head: () => ({ meta: [{ title: "Pacientes — Sereno" }, { name: "description", content: "Cadastro de pacientes." }, { property: "og:title", content: "Pacientes — Sereno" }, { property: "og:description", content: "Cadastro de pacientes." }] }),
  component: Pacientes,
});

function Pacientes() {
  const [q, setQ] = useState("");
  const { data: patients = [] } = useQuery({
    queryKey: ["patients", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });
  const list = patients.filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="text-3xl">Pacientes</h1>
        <NewPatient />
      </div>
      <Input className="mt-5" placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((p) => (
          <Link key={p.id} to="/pacientes/$id" params={{ id: p.id }} className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary">
            <div className="font-medium">{p.full_name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" />{formatBrPhone(p.phone) || "sem telefone"}{p.phone_needs_review && <span className="ml-1 rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">revisar telefone</span>}</div>
          </Link>
        ))}
        {list.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground sm:col-span-2">Nenhum paciente.</div>}
      </div>
    </div>
  );
}

function NewPatient() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", phone: "", email: "", birth_date: "", default_price: String(SESSION_DEFAULTS.price) });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients").insert({
        full_name: f.full_name.trim(),
        phone: toStoredPhone(f.phone),
        email: f.email.trim() || null,
        birth_date: f.birth_date || null,
        default_price: Number(f.default_price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["patients"] });
      setOpen(false);
      setF({ full_name: "", phone: "", email: "", birth_date: "", default_price: String(SESSION_DEFAULTS.price) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Paciente</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo paciente</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (f.phone && !isValidBrPhone(f.phone)) { toast.error("Telefone inválido: use DDD + 8 dígitos (fixo) ou DDD + 9 + 8 dígitos (celular)."); return; } create.mutate(); }}>
          <div className="space-y-1.5"><Label>Nome completo</Label><Input required value={f.full_name} onChange={set("full_name")} /></div>
          <div className="space-y-1.5"><Label>WhatsApp</Label><Input inputMode="tel" placeholder="(84) 98643-8775" value={f.phone} onChange={(e) => setF({ ...f, phone: maskBrPhone(e.target.value) })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nascimento</Label><Input type="date" value={f.birth_date} onChange={set("birth_date")} /></div>
            <div className="space-y-1.5"><Label>Valor sessão (R$)</Label><Input type="number" min="0" step="0.01" value={f.default_price} onChange={set("default_price")} /></div>
          </div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <Button type="submit" className="w-full" disabled={create.isPending}>Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
