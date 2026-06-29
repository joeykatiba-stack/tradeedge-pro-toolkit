import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — TradeEdge" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md glass-strong rounded-3xl p-8 space-y-4">
        <h1 className="font-display text-2xl font-bold">Set new password</h1>
        <div><Label>New password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
        <Button type="submit" className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Update password</Button>
      </form>
    </div>
  );
}