import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LineChart } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — TradeEdge Toolkit" }, { name: "description", content: "Sign in or create an account on TradeEdge Toolkit." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/dashboard" }); });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }
  async function signUp(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email if confirmation is required.");
    navigate({ to: "/dashboard" });
  }
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }
  async function reset(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
    setForgot(false);
  }

  return (
    <div className="container mx-auto px-4 py-16 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-md glass-strong rounded-3xl p-8">
        <div className="text-center mb-6">
          <span className="inline-grid h-12 w-12 place-items-center rounded-2xl mb-3" style={{ background: "var(--gradient-primary)" }}><LineChart className="h-6 w-6 text-white" /></span>
          <h1 className="font-display text-2xl font-bold">Welcome to TradeEdge</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access your toolkit</p>
        </div>

        {forgot ? (
          <form onSubmit={reset} className="space-y-3">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full">Send reset link</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setForgot(false)}>Back</Button>
          </form>
        ) : (
          <>
            <Button onClick={google} variant="outline" className="w-full mb-4">Continue with Google</Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4"><span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" /></div>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="signin">Sign In</TabsTrigger><TabsTrigger value="signup">Sign Up</TabsTrigger></TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3 mt-4">
                  <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{loading ? "Signing in..." : "Sign In"}</Button>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground w-full text-center" onClick={() => setForgot(true)}>Forgot password?</button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3 mt-4">
                  <div><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                  <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div><Label>Password (min 6)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{loading ? "Creating..." : "Create Account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}