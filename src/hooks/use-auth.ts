import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  refreshSession: () => Promise<Session | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  async function refreshSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[auth] Session refresh failed", error);
      setSession(null);
      setUser(null);
      setInitialized(true);
      return null;
    }
    setSession(data.session ?? null);
    setUser(data.session?.user ?? null);
    setInitialized(true);
    return data.session ?? null;
  }

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.info("[auth] State changed", event);
      if (!active) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setInitialized(true);
    });

    refreshSession().catch((error) => {
      console.error("[auth] Initial session restore threw", error);
      if (!active) return;
      setSession(null);
      setUser(null);
      setInitialized(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, session, loading: !initialized, initialized, refreshSession }),
    [user, session, initialized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}