import { supabase } from "@/integrations/supabase/client";

export const AUTH_REDIRECT_STORAGE_KEY = "tradeedge.auth.redirect";

export function getSafeAuthRedirect(raw: string | null | undefined, fallback = "/dashboard") {
  if (!raw) return fallback;

  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded.startsWith("/auth")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

export function saveAuthRedirect(path: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, getSafeAuthRedirect(path));
}

export function readAuthRedirect(fallback = "/dashboard") {
  if (typeof window === "undefined") return fallback;
  return getSafeAuthRedirect(window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY), fallback);
}

export function clearAuthRedirect() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

export async function getValidatedUserAfterSessionRestore() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("[auth] Session restore failed", sessionError);
    return null;
  }
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth] User validation failed", error);
    return null;
  }

  return data.user ?? null;
}

export async function exchangeOAuthCodeFromUrl(url: string) {
  const parsed = new URL(url);
  const providerError = parsed.searchParams.get("error") ?? parsed.hash.match(/error=([^&]+)/)?.[1];
  const providerErrorDescription =
    parsed.searchParams.get("error_description") ?? parsed.hash.match(/error_description=([^&]+)/)?.[1];

  if (providerError) {
    const message = providerErrorDescription
      ? decodeURIComponent(providerErrorDescription.replace(/\+/g, " "))
      : providerError;
    throw new Error(message);
  }

  const code = parsed.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] OAuth code exchange failed", error);
      throw error;
    }
    return data.session ?? null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] OAuth session restore failed", error);
    throw error;
  }
  return data.session ?? null;
}