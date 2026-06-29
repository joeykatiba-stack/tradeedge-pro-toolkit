import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — TradeEdge" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const get = useServerFn(getProfile);
  const upd = useServerFn(updateProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => get() });
  const [form, setForm] = useState({ username: "", full_name: "", country: "", trading_style: "", experience_level: "beginner" as "beginner" | "intermediate" | "advanced" | "professional" });

  useEffect(() => {
    if (data) setForm({
      username: data.username ?? "", full_name: data.full_name ?? "", country: data.country ?? "",
      trading_style: data.trading_style ?? "", experience_level: data.experience_level ?? "beginner",
    });
  }, [data]);

  const mut = useMutation({
    mutationFn: () => upd({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profile updated"); },
    onError: (e) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <header className="mb-6 flex justify-between items-center">
        <div><h1 className="font-display text-3xl sm:text-4xl font-bold">Profile</h1><p className="text-muted-foreground mt-1">{data?.email}</p></div>
        <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
      </header>

      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          {data?.avatar_url ? <img src={data.avatar_url} alt="" className="h-16 w-16 rounded-full" /> : <div className="h-16 w-16 rounded-full bg-accent grid place-items-center"><User className="h-7 w-7 text-muted-foreground" /></div>}
          <div className="min-w-0"><div className="font-display font-semibold text-lg truncate">{form.full_name || form.username || "Trader"}</div><div className="text-xs text-muted-foreground capitalize">{form.experience_level}</div></div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="grid sm:grid-cols-2 gap-3">
          <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div><Label>Trading Style</Label><Input value={form.trading_style} onChange={(e) => setForm({ ...form, trading_style: e.target.value })} placeholder="Scalper, swing, position..." /></div>
          <div className="sm:col-span-2"><Label>Experience Level</Label>
            <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v as typeof form.experience_level })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={mut.isPending} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{mut.isPending ? "Saving..." : "Save Profile"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}