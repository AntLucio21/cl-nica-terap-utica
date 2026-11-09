import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { role: null as null | "terapeuta" | "secretaria", email: "" };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const roles = (data ?? []).map((r) => r.role);
      return {
        role: roles.includes("terapeuta") ? ("terapeuta" as const) : roles.includes("secretaria") ? ("secretaria" as const) : null,
        email: u.user.email ?? "",
      };
    },
  });
}
