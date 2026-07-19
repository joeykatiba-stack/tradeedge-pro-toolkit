import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clearAuthRedirect,
  exchangeOAuthCodeFromUrl,
  getSafeAuthRedirect,
  readAuthRedirect,
} from "@/lib/auth-flow";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Completing Sign In — TradeEdge Toolkit" },
      { name: "description", content: "Completing secure sign-in for TradeEdge Toolkit." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [message, setMessage] = useState("Completing Google sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const currentUrl = window.location.href;
      const params = new URL(currentUrl).searchParams;
      const redirectTo = getSafeAuthRedirect(params.get("redirect"), readAuthRedirect());

      try {
        const exchangedSession = await exchangeOAuthCodeFromUrl(currentUrl);
        const restoredSession = exchangedSession ?? (await refreshSession());

        if (!restoredSession) {
          throw new Error("Sign-in completed but no local session was restored.");
        }

        clearAuthRedirect();
        if (!cancelled) navigate({ to: redirectTo, replace: true });
      } catch (error) {
        console.error("[auth] OAuth callback failed", error);
        const detail = error instanceof Error ? error.message : "Unknown authentication error";
        setMessage("Google sign-in could not be completed.");
        toast.error(detail);
        if (!cancelled) navigate({ to: "/auth", replace: true });
      }
    }

    void completeSignIn();
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshSession]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
}