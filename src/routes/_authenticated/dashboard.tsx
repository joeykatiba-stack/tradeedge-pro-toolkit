import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTrades, tradeAnalytics } from "@/lib/trades.functions";
import { getCryptoQuotes, getForexQuotes } from "@/lib/market.functions";
import { SessionClock } from "@/components/session-clock";
import { AnimatedCounter } from "@/components/animated-counter";
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TradeEdge Toolkit" }] }),
  component: Dashboard,
});

function Dashboard() {
  const trades = useServerFn(listTrades);
  const analytics = useServerFn(tradeAnalytics);
  const crypto = useServerFn(getCryptoQuotes);
  const fx = useServerFn(getForexQuotes);

  const { data: recent = [] } = useQuery({ queryKey: ["trades"], queryFn: () => trades() });
  const { data: stats } = useQuery({ queryKey: ["analytics"], queryFn: () => analytics() });
  const { data: cryptoQ = [] } = useQuery({ queryKey: ["crypto"], queryFn: () => crypto(), refetchInterval: 60_000 });
  const { data: fxQ = [] } = useQuery({ queryKey: ["fx"], queryFn: () => fx(), refetchInterval: 60_000 });

  type Card = { label: string; value: number; prefix?: string; suffix?: string; decimals?: number; icon: typeof DollarSign; accent: "success" | "destructive" | "primary" };
  const cards: Card[] = [
    { label: "Total P&L", value: stats?.totalPnl ?? 0, prefix: "$", icon: DollarSign, accent: (stats?.totalPnl ?? 0) >= 0 ? "success" : "destructive" },
    { label: "Win Rate", value: stats?.winRate ?? 0, suffix: "%", icon: Target, decimals: 1, accent: "primary" },
    { label: "Total Trades", value: stats?.total ?? 0, icon: Activity, accent: "primary" },
    { label: "Avg R:R", value: stats?.avgRR ?? 0, decimals: 2, prefix: "1:", icon: TrendingUp, accent: "success" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your trading edge at a glance.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5 hover-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className={cn("h-4 w-4", c.accent === "success" && "text-success", c.accent === "destructive" && "text-destructive", c.accent === "primary" && "text-primary-glow")} />
            </div>
            <div className={cn("font-display text-2xl font-bold mt-2", c.accent === "success" && "text-success", c.accent === "destructive" && "text-destructive", c.accent === "primary" && "text-foreground")}>
              <AnimatedCounter value={Number(c.value) || 0} decimals={c.decimals ?? 0} prefix={c.prefix ?? ""} suffix={c.suffix ?? ""} />
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold mb-3">Forex Sessions</h2>
        <SessionClock />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-strong rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Recent Trades</h3>
            <Link to="/journal" className="text-xs text-primary-glow flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No trades yet. <Link to="/journal" className="text-primary-glow">Log your first trade</Link>.</p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 6).map((t) => {
                const pnl = Number(t.pnl ?? 0);
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/20">
                    <div className="flex items-center gap-3">
                      <span className={cn("h-2 w-2 rounded-full", t.side === "buy" ? "bg-success" : "bg-destructive")} />
                      <div>
                        <div className="font-medium">{t.pair}</div>
                        <div className="text-xs text-muted-foreground capitalize">{t.side} · {new Date(t.opened_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className={cn("font-display font-semibold tabular-nums", pnl >= 0 ? "text-success" : "text-destructive")}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-4">Crypto Watch</h3>
          <div className="space-y-2">
            {cryptoQ.slice(0, 5).map((c) => (
              <div key={c.symbol} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={c.image} alt="" className="h-5 w-5 rounded-full" />
                  <span className="font-medium truncate">{c.symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">${c.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className={cn("text-xs tabular-nums flex items-center", c.change >= 0 ? "text-success" : "text-destructive")}>
                    {c.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{Math.abs(c.change).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-4">FX Rates</h3>
          <div className="grid grid-cols-2 gap-2">
            {fxQ.map((q) => (
              <div key={q.pair} className="p-3 rounded-lg bg-accent/20">
                <div className="text-xs text-muted-foreground">{q.pair}</div>
                <div className="font-display font-semibold tabular-nums">{q.price.toFixed(q.pair.endsWith("JPY") ? 2 : 4)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-3">Today's Goals</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" /> Stick to risk plan (max 2% per trade)</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary-glow" /> Take no more than 3 setups</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" /> Wait for London open before entering EUR/GBP pairs</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Journal every trade with screenshot</li>
          </ul>
        </div>
      </div>
    </div>
  );
}