import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/hooks/use-role";
import { createReceptionUser, listTeam, removeUser } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Sereno" },
      { name: "description", content: "Gerencie quem tem acesso ao sistema da clínica." },
      { property: "og:title", content: "Equipe — Sereno" },
      { property: "og:description", content: "Gerencie quem tem acesso ao sistema da clínica." },
    ],
  }),
  component: EquipePage,
});

function EquipePage() {
  const { data: me } = useRole();
  const qc = useQueryClient();
  const list = useServerFn(listTeam);
  const create = useServerFn(createReceptionUser);
  const remove = useServerFn(removeUser);
  const isTer = me?.role === "terapeuta";
  const team = useQuery({ queryKey: ["team"], queryFn: () => list(), enabled: isTer });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const add = useMutation({
    mutationFn: () => create({ data: { email, password } }),
    onSuccess: () => {
      toast.success("Acesso criado. Passe a senha pessoalmente para a recepção.");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (me && !isTer) return <p className="text-muted-foreground">Somente a terapeuta acessa esta área.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Equipe</h1>
      <ul className="divide-y rounded-2xl border bg-card">
        {(team.data ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm">{u.email}</p>
              <p className="text-xs text-muted-foreground">{u.role === "terapeuta" ? "Terapeuta" : "Recepção"}</p>
            </div>
            {u.role !== "terapeuta" && (
              <button
                aria-label="Remover acesso"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => confirm(`Remover o acesso de ${u.email}?`) && del.mutate(u.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="space-y-4 rounded-2xl border bg-card p-5"
      >
        <h2 className="text-lg">Criar acesso da recepção</h2>
        <div className="space-y-1.5">
          <Label htmlFor="em">E-mail</Label>
          <Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Senha (mínimo 10 caracteres)</Label>
          <Input id="pw" type="text" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={add.isPending}>{add.isPending ? "Criando…" : "Criar acesso"}</Button>
      </form>
    </div>
  );
}
