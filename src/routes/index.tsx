import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, Clock, Calendar, BookOpen, LineChart, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TradeEdge Toolkit — Your Complete Trading Toolkit" },
      { name: "description", content: "Forex session clock, risk and position calculators, trade journal, economic calendar and performance analytics — built for serious traders." },
      { property: "og:title", content: "TradeEdge Toolkit" },
      { property: "og:description", content: "Everything a trader needs in one platform." },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Clock, title: "Session Clock", desc: "Live forex session tracker for Sydney, Tokyo, London and New York with overlap detection.", to: "/tools" },
  { icon: Calculator, title: "Risk Calculator", desc: "Calculate exact risk per trade and never blow your account on a single position.", to: "/calculators" },
  { icon: TrendingUp, title: "Position Sizer", desc: "Get the right lot size for your account, stop loss and risk tolerance.", to: "/calculators" },
  { icon: Calendar, title: "Economic Calendar", desc: "High-impact news events, forecasts and actuals across major currencies.", to: "/calendar" },
  { icon: BookOpen, title: "Trade Journal", desc: "Log every trade, attach screenshots, review your edge over time.", to: "/journal" },
  { icon: LineChart, title: "Performance Analytics", desc: "Win rate, average R:R, monthly P&L and best/worst pairs at a glance.", to: "/analytics" },
] as const;

function Index() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-hero)" }} />
        <div className="container mx-auto px-4 py-20 sm:py-28 lg:py-36 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              Built for forex, crypto & stock traders
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Your Complete <br className="hidden sm:inline" />
              <span className="text-gradient-primary">Trading Toolkit</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything a trader needs in one platform — session clock, risk calculators, journal, calendar and performance analytics.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-glow)] hover-lift">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/tools">
                <Button size="lg" variant="outline" className="border-border/60">Explore Tools</Button>
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { v: "7+", l: "Calculators" },
                { v: "4", l: "Forex Sessions" },
                { v: "100%", l: "Free to start" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-xl p-3 text-center">
                  <div className="font-display text-2xl font-bold text-gradient-primary">{s.v}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Everything in one place</h2>
          <p className="text-muted-foreground mt-2">Stop juggling tabs. Trade with clarity.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <Link key={f.title} to={f.to} className="glass rounded-2xl p-6 hover-lift group block">
              <div className="grid h-12 w-12 place-items-center rounded-xl mb-4" style={{ background: "var(--gradient-primary)" }}>
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
              <div className="mt-4 text-sm text-primary-glow flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Ready to trade with an edge?</h2>
            <p className="text-muted-foreground mt-2">Create a free account and unlock your journal, watchlist and analytics.</p>
            <Link to="/auth"><Button size="lg" className="mt-6 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Start free</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
