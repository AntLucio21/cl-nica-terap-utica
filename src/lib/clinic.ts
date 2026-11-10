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

/** Regras de cobrança vigentes (vêm das configurações da clínica). */
export type ChargeRules = {
  /** Antecedência mínima para cancelar sem custo. */
  cancelNoticeHours: number;
  /** % do valor cobrado quando o cancelamento é feito em cima da hora (0 = nada). */
  cancelChargePct: number;
  /** % do valor cobrado em falta (0 = nada, 100 = integral). */
  noShowChargePct: number;
};

export const DEFAULT_RULES: ChargeRules = {
  cancelNoticeHours: 24,
  cancelChargePct: 0,
  noShowChargePct: 100,
};

type Chargeable = {
  price: number;
  status: string;
  payment_status: string;
  starts_at?: string;
  cancelled_at?: string | null;
};

/** Quanto a sessão gera de cobrança (recebido ou a receber). */
export function chargeAmount(s: Chargeable, rules: ChargeRules = DEFAULT_RULES): number {
  if (s.status === "cancelada") {
    if (s.payment_status === "pago") return 0; // paga e cancelada vai para "a revisar"
    if (!s.cancelled_at || !s.starts_at) return 0; // registros antigos sem data de cancelamento
    const noticeHours = (new Date(s.starts_at).getTime() - new Date(s.cancelled_at).getTime()) / 36e5;
    if (noticeHours >= rules.cancelNoticeHours) return 0;
    return (Number(s.price) * rules.cancelChargePct) / 100;
  }
  if (s.status === "faltou") return (Number(s.price) * rules.noShowChargePct) / 100;
  return Number(s.price);
}

/** Whether a session should still be charged/listed in finances. */
export function isBillable(s: Chargeable, rules: ChargeRules = DEFAULT_RULES) {
  return chargeAmount(s, rules) > 0;
}

export function summarize(sessions: Chargeable[], rules: ChargeRules = DEFAULT_RULES) {
  let recebido = 0;
  let pendente = 0;
  let aRevisar = 0; // paid but cancelled: refund or reschedule
  for (const s of sessions) {
    if (s.status === "cancelada" && s.payment_status === "pago") {
      aRevisar += Number(s.price);
      continue;
    }
    const amount = chargeAmount(s, rules);
    if (amount <= 0) continue;
    if (s.payment_status === "pago") recebido += amount;
    else pendente += amount;
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
