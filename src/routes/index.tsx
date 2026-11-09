import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarHeart, Wallet, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sereno — Gestão para clínica de psicologia" },
      { name: "description", content: "Agenda de sessões, pacientes e controle de pagamentos em um só lugar." },
      { property: "og:title", content: "Sereno — Gestão para clínica de psicologia" },
      { property: "og:description", content: "Agenda de sessões, pacientes e controle de pagamentos em um só lugar." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col px-6 py-16 md:py-28">
        <span className="font-display text-xl text-primary">Sereno</span>
        <h1 className="mt-10 text-4xl leading-tight text-foreground md:text-6xl">
          Sua clínica, no ritmo certo.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Agenda das sessões, cadastro de pacientes e controle de quem já pagou — simples para você e para a recepção.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/auth">Entrar no sistema</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarHeart, t: "Agenda", d: "Sessões de 1 hora, por dia e semana." },
            { icon: Wallet, t: "Financeiro", d: "Pago ou pendente, sem complicação." },
            { icon: MessageCircle, t: "WhatsApp", d: "Lembretes 4h antes (em breve)." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-lg">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
