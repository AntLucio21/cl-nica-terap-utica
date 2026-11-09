import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Sereno" },
      { name: "description", content: "Acesso restrito da terapeuta e da recepção." },
      { property: "og:title", content: "Entrar — Sereno" },
      { property: "og:description", content: "Acesso restrito da terapeuta e da recepção." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/agenda" });
    } catch {
      toast.error("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm">
        <span className="font-display text-lg text-primary">Sereno</span>
        <h1 className="mt-4 text-2xl">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à equipe da clínica.</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde…" : "Entrar"}
          </Button>
        </div>
      </form>
    </main>
  );
}
