import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClinicSettings() {
  return useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_settings").select("charge_no_show").eq("id", 1).maybeSingle();
      if (error) throw error;
      return { chargeNoShow: data?.charge_no_show ?? true };
    },
  });
}
