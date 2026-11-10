import { describe, expect, it } from "vitest";
import { SESSION_DEFAULTS, clinicDateTime, reminderDueAt, summarize } from "./clinic";

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
  it("sessões canceladas não entram no financeiro", () => {
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
  it("falta cobra quando a clínica cobra faltas", () => {
    expect(summarize([{ price: 100, payment_status: "pendente", status: "faltou" }], { chargeNoShow: true }).pendente).toBe(100);
  });
  it("falta não cobra quando a clínica não cobra faltas", () => {
    expect(summarize([{ price: 100, payment_status: "pendente", status: "faltou" }], { chargeNoShow: false }).pendente).toBe(0);
  });
  it("horário digitado é de Fortaleza", () => {
    expect(clinicDateTime("2026-11-10", "09:00").toISOString()).toBe("2026-11-10T12:00:00.000Z");
  });
});
