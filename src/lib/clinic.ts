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

/** Whether a session should still be charged/listed in finances. */
export function isBillable(s: { status: string; payment_status: string }, opts: { chargeNoShow?: boolean } = {}) {
  if (s.status === "cancelada") return false;
  if (s.status === "faltou" && opts.chargeNoShow === false && s.payment_status !== "pago") return false;
  return true;
}

export function summarize(
  sessions: { price: number; payment_status: string; status: string }[],
  opts: { chargeNoShow?: boolean } = {},
) {
  let recebido = 0;
  let pendente = 0;
  let aRevisar = 0; // paid but cancelled: refund or reschedule
  for (const s of sessions) {
    if (s.status === "cancelada") {
      if (s.payment_status === "pago") aRevisar += Number(s.price);
      continue;
    }
    if (!isBillable(s, opts)) continue;
    if (s.payment_status === "pago") recebido += Number(s.price);
    else pendente += Number(s.price);
  }
  return { recebido, pendente, aRevisar };
}

export const CLINIC_TZ = "America/Fortaleza";
/** Build a timestamp from a date + time typed as clinic local time (Fortaleza, UTC-3, no DST). */
export const clinicDateTime = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`);

export function overlapMessage(e: { code?: string; message: string }) {
  return e.code === "23P01" ? e.message : null;
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
