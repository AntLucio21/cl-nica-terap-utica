import { describe, expect, it } from "vitest";
import { SESSION_DEFAULTS, chargeAmount, clinicDateTime, reminderDueAt, summarize } from "./clinic";

describe("regras da clínica", () => {
  it("sessão padrão dura 1 hora", () => {
    expect(SESSION_DEFAULTS.durationMin).toBe(60);
  });
  it("valor padrão é R$ 100", () => {
    expect(SESSION_DEFAULTS.price).toBe(100);
  });
  it("lembrete sai 4 horas antes", () => {
    const start = new Date("2026-11-10T18:00:00Z");
    expect(reminderDueAt(start).toISOString()).toBe("2026-11-10T14:00:00.000Z");
  });
  it("sessões canceladas não entram no financeiro por padrão", () => {
    const r = summarize([
      { price: 100, payment_status: "pago", status: "realizada" },
      { price: 100, payment_status: "pendente", status: "agendada" },
      { price: 100, payment_status: "pendente", status: "cancelada" },
    ]);
    expect(r).toEqual({ recebido: 100, pendente: 100, aRevisar: 0 });
  });
  it("cancelada já paga vai para revisão, não para recebido", () => {
    expect(summarize([{ price: 100, payment_status: "pago", status: "cancelada" }])).toEqual({ recebido: 0, pendente: 0, aRevisar: 100 });
  });
  it("falta cobra integral por padrão", () => {
    expect(summarize([{ price: 100, payment_status: "pendente", status: "faltou" }]).pendente).toBe(100);
  });
  it("falta não cobra quando percentual é 0", () => {
    expect(summarize([{ price: 100, payment_status: "pendente", status: "faltou" }], { cancelNoticeHours: 24, cancelChargePct: 0, noShowChargePct: 0 }).pendente).toBe(0);
  });
  it("falta cobra percentual parcial", () => {
    expect(summarize([{ price: 100, payment_status: "pendente", status: "faltou" }], { cancelNoticeHours: 24, cancelChargePct: 0, noShowChargePct: 50 }).pendente).toBe(50);
  });
  it("cancelamento em cima da hora cobra o percentual configurado", () => {
    const s = {
      price: 100,
      payment_status: "pendente",
      status: "cancelada",
      starts_at: "2026-11-10T14:00:00.000Z",
      cancelled_at: "2026-11-10T12:00:00.000Z", // 2h antes
    };
    expect(chargeAmount(s, { cancelNoticeHours: 24, cancelChargePct: 100, noShowChargePct: 100 })).toBe(100);
    expect(chargeAmount(s, { cancelNoticeHours: 24, cancelChargePct: 50, noShowChargePct: 100 })).toBe(50);
  });
  it("cancelamento com antecedência suficiente não cobra", () => {
    const s = {
      price: 100,
      payment_status: "pendente",
      status: "cancelada",
      starts_at: "2026-11-10T14:00:00.000Z",
      cancelled_at: "2026-11-09T10:00:00.000Z", // 28h antes
    };
    expect(chargeAmount(s, { cancelNoticeHours: 24, cancelChargePct: 100, noShowChargePct: 100 })).toBe(0);
  });
  it("cancelada antiga sem data de cancelamento não cobra", () => {
    expect(chargeAmount({ price: 100, payment_status: "pendente", status: "cancelada" }, { cancelNoticeHours: 24, cancelChargePct: 100, noShowChargePct: 100 })).toBe(0);
  });
  it("horário digitado é de Fortaleza", () => {
    expect(clinicDateTime("2026-11-10", "09:00").toISOString()).toBe("2026-11-10T12:00:00.000Z");
  });
});
