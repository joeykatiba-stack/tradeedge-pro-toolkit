import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { tradeAnalytics } from "@/lib/trades.functions";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — TradeEdge" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fn = useServerFn(tradeAnalytics);
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: () => fn() });
  if (!data) return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading analytics...</div>;

  const winLoss = [
    { name: "Wins", value: data.wins, fill: "oklch(0.72 0.17 160)" },
    { name: "Losses", value: data.losses, fill: "oklch(0.65 0.24 25)" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <header><h1 className="font-display text-3xl sm:text-4xl font-bold">Performance Analytics</h1><p className="text-muted-foreground mt-1">Your edge, quantified.</p></header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total P&L", v: `$${data.totalPnl.toFixed(2)}`, c: data.totalPnl >= 0 ? "text-success" : "text-destructive" },
          { l: "Win Rate", v: `${data.winRate.toFixed(1)}%`, c: "text-primary-glow" },
          { l: "Avg R:R", v: `1:${data.avgRR.toFixed(2)}`, c: "text-foreground" },
          { l: "Total Trades", v: data.total, c: "text-foreground" },
          { l: "Largest Win", v: `+$${data.largestWin.toFixed(2)}`, c: "text-success" },
          { l: "Largest Loss", v: `$${data.largestLoss.toFixed(2)}`, c: "text-destructive" },
          { l: "Best Pair", v: data.best?.pair ?? "—", c: "text-success" },
          { l: "Most Traded", v: data.most?.pair ?? "—", c: "text-primary-glow" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className={`font-display text-2xl font-bold mt-1 ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-3">Monthly P&L</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <XAxis dataKey="month" stroke="oklch(0.7 0.025 255)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.025 255)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.03 260)", border: "1px solid oklch(0.3 0.03 260)", borderRadius: 8 }} />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {data.monthly.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? "oklch(0.72 0.17 160)" : "oklch(0.65 0.24 25)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-strong rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-3">Wins vs Losses</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={winLoss} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {winLoss.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.2 0.03 260)", border: "1px solid oklch(0.3 0.03 260)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}