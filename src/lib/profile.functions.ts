import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const profileInput = z.object({
  username: z.string().min(2).max(40).nullable().optional(),
  full_name: z.string().max(80).nullable().optional(),
  country: z.string().max(60).nullable().optional(),
  trading_style: z.string().max(60).nullable().optional(),
  experience_level: z.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("user_settings").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const settingsInput = z.object({
  notifications: z.boolean().optional(),
  language: z.string().max(10).optional(),
  currency: z.string().max(10).optional(),
  time_zone: z.string().max(50).optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("user_settings").update(data).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });