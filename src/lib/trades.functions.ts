import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tradeInput = z.object({
  id: z.string().uuid().optional(),
  pair: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  entry: z.number(),
  exit: z.number().nullable().optional(),
  stop_loss: z.number().nullable().optional(),
  take_profit: z.number().nullable().optional(),
  lot_size: z.number().nullable().optional(),
  pnl: z.number().nullable().optional(),
  screenshot_url: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  opened_at: z.string().optional(),
  closed_at: z.string().nullable().optional(),
});

export const listTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("trades")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tradeInput.parse(d))
  .handler(async ({ context, data }) => {
    const row = { ...data, user_id: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("trades").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("trades").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("trades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const tradeAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("trades").select("*").not("pnl", "is", null);
    if (error) throw new Error(error.message);
    const trades = data ?? [];
    const wins = trades.filter((t) => Number(t.pnl) > 0);
    const losses = trades.filter((t) => Number(t.pnl) < 0);
    const totalPnl = trades.reduce((a, t) => a + Number(t.pnl ?? 0), 0);
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((a, t) => a + Number(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + Number(t.pnl), 0) / losses.length) : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;
    // by pair
    const byPair: Record<string, { count: number; pnl: number }> = {};
    for (const t of trades) {
      const k = t.pair;
      byPair[k] ??= { count: 0, pnl: 0 };
      byPair[k].count++;
      byPair[k].pnl += Number(t.pnl ?? 0);
    }
    const pairsArr = Object.entries(byPair).map(([pair, v]) => ({ pair, ...v }));
    const best = [...pairsArr].sort((a, b) => b.pnl - a.pnl)[0];
    const worst = [...pairsArr].sort((a, b) => a.pnl - b.pnl)[0];
    const most = [...pairsArr].sort((a, b) => b.count - a.count)[0];
    // monthly
    const monthly: Record<string, number> = {};
    for (const t of trades) {
      const m = (t.opened_at ?? "").slice(0, 7);
      if (!m) continue;
      monthly[m] = (monthly[m] ?? 0) + Number(t.pnl ?? 0);
    }
    const monthlyArr = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, pnl]) => ({ month, pnl: Math.round(pnl * 100) / 100 }));
    const largestWin = wins.reduce((a, t) => Math.max(a, Number(t.pnl)), 0);
    const largestLoss = losses.reduce((a, t) => Math.min(a, Number(t.pnl)), 0);
    return {
      total: trades.length,
      wins: wins.length, losses: losses.length,
      winRate, totalPnl, avgRR, avgWin, avgLoss,
      largestWin, largestLoss,
      best, worst, most,
      monthly: monthlyArr,
    };
  });