import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tools/entry-check")({
  head: () => ({
    meta: [
      { title: "Entry Validity Check — TradeEdge Toolkit" },
      { name: "description", content: "Combine HTF and LTF structure with live key levels to decide if an entry is valid." },
    ],
  }),
  component: EntryCheckPage,
});

const TIMEFRAMES = ["1M", "1W", "1D", "4H", "1H", "30m", "15m", "5m", "1m"] as const;

type AnalysisResult = {
  trend: "bullish" | "bearish" | "ranging";
  last_event: { type: "BOS" | "CHoCH" | "none"; direction: "bullish" | "bearish" | "none"; note: string };
  bias: "bullish" | "bearish" | "ranging";
  swing_high: { price: number | null };
  swing_low: { price: number | null };
};
type Analysis = { id: string; symbol: string | null; timeframe: string; result_json: AnalysisResult; created_at: string };
type Level = {
  symbol: string; pdh: number | null; pdl: number | null; pwh: number | null; pwl: number | null;
  premium_discount_midpoint: number | null; round_numbers: number[]; current_price: number | null;
};

function nearestLevel(price: number, level: Level): { name: string; value: number; distancePct: number } | null {
  const cands: [string, number | null][] = [
    ["PDH", level.pdh], ["PDL", level.pdl], ["PWH", level.pwh], ["PWL", level.pwl],
    ...(level.round_numbers ?? []).map((n, i) => [`RN${i}`, n] as [string, number]),
  ];
  let best: { name: string; value: number; distancePct: number } | null = null;
  for (const [name, v] of cands) {
    if (v == null) continue;
    const d = Math.abs((price - v) / price) * 100;
    if (best == null || d < best.distancePct) best = { name, value: v, distancePct: d };
  }
  return best;
}

function EntryCheckPage() {
  const [symbol, setSymbol] = useState("EUR/USD");
  const [htf, setHtf] = useState("4H");
  const [ltf, setLtf] = useState("5m");
  const [priceOverride, setPriceOverride] = useState<string>("");

  const { data: analyses = [] } = useQuery({
    queryKey: ["entry_check_inputs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("structure_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as Analysis[]) ?? [];
    },
  });

  const { data: levels = [] } = useQuery({
    queryKey: ["price_levels_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_levels").select("*");
      if (error) throw error;
      return (data as unknown as Level[]) ?? [];
    },
    refetchInterval: 30_000,
  });

  const level = useMemo(() => levels.find((l) => l.symbol === symbol) ?? null, [levels, symbol]);
  const htfAnalysis = useMemo(
    () => analyses.find((a) => a.timeframe === htf && (!a.symbol || a.symbol === symbol)) ?? null,
    [analyses, htf, symbol],
  );
  const ltfAnalysis = useMemo(
    () => analyses.find((a) => a.timeframe === ltf && (!a.symbol || a.symbol === symbol)) ?? null,
    [analyses, ltf, symbol],
  );

  const verdict = useMemo(() => {
    if (!htfAnalysis || !ltfAnalysis || !level) return null;
    const priceNum = priceOverride ? Number(priceOverride) : level.current_price;
    if (!priceNum || !isFinite(priceNum)) return null;

    const H = htfAnalysis.result_json;
    const L = ltfAnalysis.result_json;
    const mid = level.premium_discount_midpoint;

    const htfTrend = H.trend === "bullish" || H.trend === "bearish";
    const htfBOS = H.last_event.type === "BOS" && H.last_event.direction === H.bias;
    const direction = H.bias; // bullish → long, bearish → short

    let zone: "premium" | "discount" | "midline" = "midline";
    if (mid != null) zone = priceNum > mid ? "premium" : priceNum < mid ? "discount" : "midline";

    const zoneOk =
      (direction === "bullish" && zone === "discount") ||
      (direction === "bearish" && zone === "premium");

    const ltfConfirms =
      (L.last_event.type === "BOS" || L.last_event.type === "CHoCH") &&
      L.last_event.direction === direction;

    const near = nearestLevel(priceNum, level);
    const nearLevelOk = !!near && near.distancePct < 0.15; // within 0.15%

    const conditions = [
      { label: `HTF (${htf}) shows a clear ${H.bias} trend with confirmed BOS`, ok: htfTrend && htfBOS, detail: `Trend: ${H.trend} · Last: ${H.last_event.type} ${H.last_event.direction}` },
      { label: `Price is in ${direction === "bullish" ? "discount" : direction === "bearish" ? "premium" : "correct"} zone`, ok: zoneOk, detail: `Current zone: ${zone} · Midpoint: ${mid ?? "—"}` },
      { label: `LTF (${ltf}) confirms HTF direction with BOS/CHoCH`, ok: ltfConfirms, detail: `LTF last: ${L.last_event.type} ${L.last_event.direction}` },
      { label: `Price reacting near a key level`, ok: nearLevelOk, detail: near ? `${near.name} @ ${near.value} (${near.distancePct.toFixed(2)}% away)` : "No nearby level" },
    ];
    const valid = conditions.every((c) => c.ok);
    return { valid, direction, conditions, price: priceNum, zone };
  }, [htfAnalysis, ltfAnalysis, level, priceOverride, htf, ltf]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <header className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Entry Validity Check</h1>
          <p className="text-muted-foreground mt-1">Combines your latest HTF/LTF analysis with live key levels.</p>
        </div>
      </header>

      <Card className="glass mb-6">
        <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => <SelectItem key={l.symbol} value={l.symbol}>{l.symbol}</SelectItem>)}
                {!levels.find((l) => l.symbol === symbol) && <SelectItem value={symbol}>{symbol}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>HTF</Label>
            <Select value={htf} onValueChange={setHtf}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>LTF</Label>
            <Select value={ltf} onValueChange={setLtf}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price (optional)</Label>
            <Input className="mt-1" placeholder={level?.current_price?.toString() ?? "auto"} value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {!htfAnalysis || !ltfAnalysis ? (
        <Card className="glass"><CardContent className="p-6 text-sm text-muted-foreground">
          Missing a saved structure analysis for {!htfAnalysis ? htf : ltf}. Run one from the Structure Analysis tool.
        </CardContent></Card>
      ) : !level ? (
        <Card className="glass"><CardContent className="p-6 text-sm text-muted-foreground">
          No live levels for {symbol} yet. Wait for the next scheduled fetch.
        </CardContent></Card>
      ) : verdict ? (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-xl">
                Verdict: <span className={verdict.valid ? "text-emerald-400" : "text-red-400"}>
                  {verdict.valid ? "Entry valid" : "Not valid"}
                </span>
              </CardTitle>
              <Badge variant="outline">{verdict.direction === "bullish" ? "Long setup" : verdict.direction === "bearish" ? "Short setup" : "No bias"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {verdict.conditions.map((c, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg border border-border/40">
                {c.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.detail}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}