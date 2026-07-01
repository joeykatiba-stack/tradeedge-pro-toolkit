import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tools/levels")({
  head: () => ({
    meta: [
      { title: "Live Key Levels — TradeEdge Toolkit" },
      { name: "description", content: "Live previous day/week highs and lows, premium/discount midpoints, and nearest round numbers across major markets." },
    ],
  }),
  component: LevelsPage,
});

type Row = {
  symbol: string;
  pdh: number | null;
  pdl: number | null;
  pwh: number | null;
  pwl: number | null;
  premium_discount_midpoint: number | null;
  round_numbers: number[];
  current_price: number | null;
  updated_at: string;
};

function zone(price: number | null, mid: number | null): "premium" | "discount" | "midline" | "unknown" {
  if (price == null || mid == null) return "unknown";
  const delta = (price - mid) / mid;
  if (Math.abs(delta) < 0.001) return "midline";
  return price > mid ? "premium" : "discount";
}

function fmt(n: number | null | undefined, digits = 4) {
  if (n == null || !isFinite(Number(n))) return "—";
  const v = Number(n);
  return v > 100 ? v.toFixed(2) : v.toFixed(digits);
}

function LevelsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase.from("price_levels").select("*").order("symbol");
      if (!ignore) {
        setRows((data as unknown as Row[]) ?? []);
        setLoading(false);
      }
    })();
    const channel = supabase
      .channel("price_levels_stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "price_levels" },
        (payload) => {
          setRows((prev) => {
            const next = [...prev];
            const row = payload.new as unknown as Row;
            const idx = next.findIndex((r) => r.symbol === row.symbol);
            if (idx >= 0) next[idx] = row;
            else next.push(row);
            return next.sort((a, b) => a.symbol.localeCompare(b.symbol));
          });
        },
      )
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Live Key Levels</h1>
          <p className="text-muted-foreground mt-1">Auto-updating every minute. Marker refreshes live via Realtime.</p>
        </div>
      </header>

      {loading ? (
        <p className="text-muted-foreground">Loading market data…</p>
      ) : rows.length === 0 ? (
        <Card className="glass">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Waiting for the first scheduled fetch to populate market data. This runs every minute.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const z = zone(r.current_price, r.premium_discount_midpoint);
            const zoneColor =
              z === "premium" ? "bg-red-500/15 text-red-400 border-red-500/30"
              : z === "discount" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-muted text-muted-foreground";
            return (
              <Card key={r.symbol} className="glass">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-lg">{r.symbol}</CardTitle>
                    <Badge variant="outline" className={zoneColor}>{z}</Badge>
                  </div>
                  <div className="text-2xl font-bold font-mono mt-1">{fmt(r.current_price)}</div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="PDH" value={fmt(r.pdh)} />
                    <Stat label="PDL" value={fmt(r.pdl)} />
                    <Stat label="PWH" value={fmt(r.pwh)} />
                    <Stat label="PWL" value={fmt(r.pwl)} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">50% Midpoint (daily)</div>
                    <div className="font-mono">{fmt(r.premium_discount_midpoint)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Round Numbers</div>
                    <div className="flex flex-wrap gap-1">
                      {(r.round_numbers ?? []).map((n) => (
                        <span key={n} className="px-2 py-0.5 text-xs rounded-md bg-accent/50 font-mono">{fmt(n)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Updated {new Date(r.updated_at).toLocaleTimeString()}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}