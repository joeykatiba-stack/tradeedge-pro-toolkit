import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/profile.functions";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — TradeEdge" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(getSettings);
  const upd = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => get() });
  const [form, setForm] = useState({ notifications: true, language: "en", currency: "USD", time_zone: "UTC" });
  useEffect(() => { if (data) setForm({ notifications: data.notifications, language: data.language, currency: data.currency, time_zone: data.time_zone }); }, [data]);

  const mut = useMutation({
    mutationFn: () => upd({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Settings</h1>
        <PwaInstallButton />
      </div>
      <div className="glass-strong rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><Label className="text-base">Notifications</Label><p className="text-xs text-muted-foreground">Receive trade and market alerts</p></div>
          <Switch checked={form.notifications} onCheckedChange={(v) => setForm({ ...form, notifications: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-base">Theme</Label><p className="text-xs text-muted-foreground">Dark mode is permanent — built for traders.</p></div>
          <span className="text-xs px-2 py-1 rounded-md bg-accent/40 text-muted-foreground">Dark</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem><SelectItem value="es">Español</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="de">Deutsch</SelectItem><SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Time Zone</Label>
            <Select value={form.time_zone} onValueChange={(v) => setForm({ ...form, time_zone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{mut.isPending ? "Saving..." : "Save Settings"}</Button></div>
      </div>
    </div>
  );
}