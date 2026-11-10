import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_RULES, type ChargeRules } from "@/lib/clinic";

export type ClinicSettings = {
  defaultPrice: number;
  defaultDurationMin: number;
  intervalMin: number;
  reminderHoursBefore: number;
  cancelNoticeHours: number;
  cancelChargePct: number;
  noShowChargePct: number;
  paymentMethods: string[];
  pixKey: string;
  clinicName: string;
  clinicPhone: string;
  logoUrl: string;
  receptionCanSeeFinancials: boolean;
  reminderTemplate: string;
  billingTemplate: string;
};

export const SETTINGS_DEFAULTS: ClinicSettings = {
  defaultPrice: 100,
  defaultDurationMin: 60,
  intervalMin: 0,
  reminderHoursBefore: 4,
  cancelNoticeHours: DEFAULT_RULES.cancelNoticeHours,
  cancelChargePct: DEFAULT_RULES.cancelChargePct,
  noShowChargePct: DEFAULT_RULES.noShowChargePct,
  paymentMethods: ["pix", "dinheiro", "cartao"],
  pixKey: "",
  clinicName: "Sereno",
  clinicPhone: "",
  logoUrl: "",
  receptionCanSeeFinancials: true,
  reminderTemplate: "Olá, {nome}! Lembrando da sua sessão hoje às {horario}. Até logo!",
  billingTemplate: "Olá, {nome}! Passando para lembrar do pagamento da sessão de {data} no valor de {valor}. Segue o Pix: {pix}",
};

/** Regras de cobrança derivadas das configurações. */
export function rulesOf(s: ClinicSettings): ChargeRules {
  return {
    cancelNoticeHours: s.cancelNoticeHours,
    cancelChargePct: s.cancelChargePct,
    noShowChargePct: s.noShowChargePct,
  };
}

/**
 * Lê as configurações da clínica. Só a terapeuta tem leitura no banco;
 * para a recepção (ou qualquer erro) caem os valores padrão.
 */
export function useClinicSettings() {
  return useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async (): Promise<ClinicSettings> => {
      const { data, error } = await supabase.from("clinic_settings").select("*").eq("id", 1).maybeSingle();
      if (error || !data) return SETTINGS_DEFAULTS;
      return {
        defaultPrice: Number(data.default_price),
        defaultDurationMin: data.default_duration_min,
        intervalMin: data.interval_min,
        reminderHoursBefore: data.reminder_hours_before,
        cancelNoticeHours: data.cancel_notice_hours,
        cancelChargePct: data.cancel_charge_pct,
        noShowChargePct: data.no_show_charge_pct,
        paymentMethods: data.payment_methods,
        pixKey: data.pix_key,
        clinicName: data.clinic_name,
        clinicPhone: data.clinic_phone,
        logoUrl: data.logo_url,
        receptionCanSeeFinancials: data.reception_can_see_financials,
        reminderTemplate: data.reminder_template,
        billingTemplate: data.billing_template,
      };
    },
  });
}

/** Recepção: se a terapeuta liberou ver o financeiro (função security definer, legível por toda a equipe). */
export function useReceptionCanSeeFinancials(enabled: boolean) {
  return useQuery({
    queryKey: ["reception-financials"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reception_can_see_financials");
      if (error) return true;
      return data !== false;
    },
  });
}
