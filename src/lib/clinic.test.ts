import { describe, expect, it } from "vitest";
import { SESSION_DEFAULTS, reminderDueAt, summarize } from "./clinic";

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
    expect(r).toEqual({ recebido: 100, pendente: 100 });
  });
});
