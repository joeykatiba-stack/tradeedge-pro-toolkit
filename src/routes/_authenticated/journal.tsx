import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTrades, upsertTrade, deleteTrade } from "@/lib/trades.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Trading Journal — TradeEdge" }] }),
  component: JournalPage,
});

type FormState = {
  id?: string; pair: string; side: "buy" | "sell"; entry: string; exit: string;
  stop_loss: string; take_profit: string; lot_size: string; pnl: string;
  notes: string; opened_at: string; screenshot_url: string;
};
const blank: FormState = { pair: "EUR/USD", side: "buy", entry: "", exit: "", stop_loss: "", take_profit: "", lot_size: "", pnl: "", notes: "", opened_at: new Date().toISOString().slice(0, 16), screenshot_url: "" };

function JournalPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTrades);
  const save = useServerFn(upsertTrade);
  const del = useServerFn(deleteTrade);
  const { data: trades = [] } = useQuery({ queryKey: ["trades"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);

  const saveMut = useMutation({
    mutationFn: (input: FormState) => save({ data: {
      id: input.id, pair: input.pair, side: input.side,
      entry: parseFloat(input.entry) || 0,
      exit: input.exit ? parseFloat(input.exit) : null,
      stop_loss: input.stop_loss ? parseFloat(input.stop_loss) : null,
      take_profit: input.take_profit ? parseFloat(input.take_profit) : null,
      lot_size: input.lot_size ? parseFloat(input.lot_size) : null,
      pnl: input.pnl ? parseFloat(input.pnl) : null,
      notes: input.notes || null,
      opened_at: new Date(input.opened_at).toISOString(),
      screenshot_url: input.screenshot_url || null,
    } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trades"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); setOpen(false); setForm(blank); toast.success("Trade saved"); },
    onError: (e) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trades"] }); qc.invalidateQueries({ queryKey: ["analytics"] }); toast.success("Trade deleted"); },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("trade-screenshots").upload(path, file);
    if (error) return toast.error(error.message);
    const { data: signed } = await supabase.storage.from("trade-screenshots").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed) setForm({ ...form, screenshot_url: signed.signedUrl });
    toast.success("Screenshot uploaded");
  }

  function openEdit(t: typeof trades[number]) {
    setForm({
      id: t.id, pair: t.pair, side: t.side, entry: String(t.entry), exit: t.exit ? String(t.exit) : "",
      stop_loss: t.stop_loss ? String(t.stop_loss) : "", take_profit: t.take_profit ? String(t.take_profit) : "",
      lot_size: t.lot_size ? String(t.lot_size) : "", pnl: t.pnl ? String(t.pnl) : "",
      notes: t.notes ?? "", opened_at: new Date(t.opened_at).toISOString().slice(0, 16), screenshot_url: t.screenshot_url ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Trading Journal</h1>
          <p className="text-muted-foreground mt-1">Log, review and learn from every trade.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(blank); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Add Trade</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Trade</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="grid grid-cols-2 gap-3">
              <div><Label>Pair</Label><Input value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value })} /></div>
              <div><Label>Side</Label>
                <Select value={form.side} onValueChange={(v) => setForm({ ...form, side: v as "buy" | "sell" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="sell">Sell</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Entry</Label><Input type="number" step="any" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} required /></div>
              <div><Label>Exit</Label><Input type="number" step="any" value={form.exit} onChange={(e) => setForm({ ...form, exit: e.target.value })} /></div>
              <div><Label>Stop Loss</Label><Input type="number" step="any" value={form.stop_loss} onChange={(e) => setForm({ ...form, stop_loss: e.target.value })} /></div>
              <div><Label>Take Profit</Label><Input type="number" step="any" value={form.take_profit} onChange={(e) => setForm({ ...form, take_profit: e.target.value })} /></div>
              <div><Label>Lot Size</Label><Input type="number" step="any" value={form.lot_size} onChange={(e) => setForm({ ...form, lot_size: e.target.value })} /></div>
              <div><Label>P/L ($)</Label><Input type="number" step="any" value={form.pnl} onChange={(e) => setForm({ ...form, pnl: e.target.value })} /></div>
              <div className="col-span-2"><Label>Opened At</Label><Input type="datetime-local" value={form.opened_at} onChange={(e) => setForm({ ...form, opened_at: e.target.value })} /></div>
              <div className="col-span-2"><Label>Screenshot</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handleUpload} />
                  {form.screenshot_url && <a href={form.screenshot_url} target="_blank" className="text-primary-glow text-xs">View</a>}
                </div>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMut.isPending} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{saveMut.isPending ? "Saving..." : "Save Trade"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Pair</th><th className="text-left px-4 py-3">Side</th><th className="text-right px-4 py-3">Entry</th><th className="text-right px-4 py-3">Exit</th><th className="text-right px-4 py-3">P/L</th><th className="px-4 py-3"></th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {trades.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No trades yet. Click "Add Trade" to log your first one.</td></tr>}
              {trades.map((t) => {
                const pnl = Number(t.pnl ?? 0);
                return (
                  <tr key={t.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{new Date(t.opened_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold">{t.pair}</td>
                    <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-md text-[10px] uppercase", t.side === "buy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{t.side}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(t.entry).toFixed(5)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.exit ? Number(t.exit).toFixed(5) : "—"}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", pnl >= 0 ? "text-success" : pnl < 0 ? "text-destructive" : "")}>{t.pnl !== null ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">{t.screenshot_url && <a href={t.screenshot_url} target="_blank"><ImageIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" /></a>}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-accent/40"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => delMut.mutate(t.id)} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}