import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertTerapeuta(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "terapeuta");
  if (!data?.length) throw new Error("Apenas a terapeuta pode gerenciar a equipe.");
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTerapeuta(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 50 });
    return (data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      role: roles?.find((r) => r.user_id === u.id)?.role ?? null,
      banned: Boolean((u as { banned_until?: string }).banned_until && new Date((u as { banned_until?: string }).banned_until!).getTime() > Date.now()),
    }));
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), password: z.string().min(10).max(72) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertTerapeuta(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertTerapeuta(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode desativar a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createReceptionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(255), password: z.string().min(10).max(72) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertTerapeuta(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar a conta.");
    await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: "secretaria" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const removeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertTerapeuta(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode remover a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
