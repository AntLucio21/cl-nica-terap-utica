export const SESSION_DEFAULTS = {
  durationMin: 60,
  price: 100,
  reminderHoursBefore: 4,
} as const;

export function reminderDueAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - SESSION_DEFAULTS.reminderHoursBefore * 60 * 60 * 1000);
}

export type SessionStatus = "agendada" | "realizada" | "cancelada" | "faltou";
export type PaymentStatus = "pendente" | "pago";

export const STATUS_LABEL: Record<SessionStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  faltou: "Faltou",
};

export function summarize(sessions: { price: number; payment_status: string; status: string }[]) {
  let recebido = 0;
  let pendente = 0;
  for (const s of sessions) {
    if (s.status === "cancelada") continue;
    if (s.payment_status === "pago") recebido += Number(s.price);
    else pendente += Number(s.price);
  }
  return { recebido, pendente };
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
