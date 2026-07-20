import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CheckCircle2, XCircle, Target, ChevronsUpDown, Search, RefreshCw, Sparkles } from "lucide-react";
import { ASSETS, ASSET_BY_SYMBOL, stockAsset, type Asset } from "@/lib/assets";
import { ensureLevelsForSymbol, evaluateEntry } from "@/lib/evaluator.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools/entry-check")({
  head: () => ({
    meta: [
      { title: "Entry Evaluator — Institutional ICT Analysis" },
      { name: "description", content: "Universal ICT entry evaluator with live premium/discount levels, BOS/CHOCH detection, and 0-100 setup quality scoring across forex, indices, commodities, crypto, futures, and stocks." },
    ],
  }),
  component: EntryCheckPage,
});

type Level = {
  symbol: string;
  current_price: number | null;
  pdh: number | null; pdl: number | null;
  pwh: number | null; pwl: number | null;
  pmh: number | null; pml: number | null;
  pqh: number | null; pql: number | null;
  premium_discount_midpoint: number | null;
  equilibrium: number | null;
  updated_at: string;
  asset_class?: string | null;
};

function zoneFor(price: number | null, mid: number | null): "premium" | "discount" | "equilibrium" | "unknown" {
  if (price == null || mid == null) return "unknown";
  const d = (price - mid) / mid;
  if (Math.abs(d) < 0.0007) return "equilibrium";
  return price > mid ? "premium" : "discount";
}

function fmt(n: number | null | undefined, decimals?: number) {
  if (n == null || !isFinite(Number(n))) return "—";
  const v = Number(n);
  const d = decimals ?? (v >= 1000 ? 2 : v >= 10 ? 3 : 5);
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function EntryCheckPage() {
  const qc = useQueryClient();
  const [asset, setAsset] = useState<Asset>(ASSET_BY_SYMBOL["EUR/USD"]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stockTicker, setStockTicker] = useState("");

  // ICT input state
  const [bias, setBias] = useState<"bullish" | "bearish" | "ranging">("bullish");
  const [htfBos, setHtfBos] = useState(true);
  const [ltfChoch, setLtfChoch] = useState(true);
  const [liquiditySweep, setLiquiditySweep] = useState(false);
  const [orderBlock, setOrderBlock] = useState(true);
  const [fvg, setFvg] = useState(true);
  const [killzone, setKillzone] = useState(true);
  const [rr, setRr] = useState("2.5");

  const { data: level, isFetching } = useQuery({
    queryKey: ["price_levels", asset.symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_levels")
        .select("*")
        .eq("symbol", asset.symbol)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Level | null) ?? null;
    },
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const ensureFn = useServerFn(ensureLevelsForSymbol);
  const ensureMut = useMutation({
    mutationFn: (a: Asset) => ensureFn({ data: { symbol: a.symbol, td: a.td, assetClass: a.assetClass } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price_levels", asset.symbol] });
      toast.success("Live levels refreshed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to fetch levels"),
  });

  const evalFn = useServerFn(evaluateEntry);
  const evalMut = useMutation({
    mutationFn: () =>
      evalFn({
        data: {
          symbol: asset.symbol,
          bias,
          htf_bos: htfBos,
          ltf_choch: ltfChoch,
          liquidity_sweep: liquiditySweep,
          order_block_present: orderBlock,
          fvg_present: fvg,
          in_killzone: killzone,
          rr: Number(rr) || 0,
          levels: (level ?? {
            symbol: asset.symbol,
            current_price: null, pdh: null, pdl: null, pwh: null, pwl: null,
            pmh: null, pml: null, pqh: null, pql: null, equilibrium: null,
            premium_discount_midpoint: null,
          }) as never,
        },
      }),
  });

  const grouped = useMemo(() => {
    const g: Record<string, Asset[]> = {};
    for (const a of ASSETS) (g[a.assetClass] ??= []).push(a);
    return g;
  }, []);

  const price = level?.current_price ?? null;
  const mid = level?.equilibrium ?? level?.premium_discount_midpoint ?? null;
  const zone = zoneFor(price, mid);
  const zoneClasses =
    zone === "premium" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : zone === "discount" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : zone === "equilibrium" ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
    : "bg-muted text-muted-foreground";

  const digits = asset.pipDecimals ?? 4;
  const lastUpdated = level?.updated_at ? new Date(level.updated_at) : null;

  const eval_ = evalMut.data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Entry Evaluator</h1>
          <p className="text-muted-foreground mt-1">Institutional ICT analysis with live levels, premium/discount tracking, and 0–100 setup scoring.</p>
        </div>
      </header>

      {/* Asset Picker */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Asset</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
          <div>
            <Label className="text-xs">Symbol</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full mt-1 justify-between font-normal">
                  <span className="flex items-center gap-2"><Search className="h-4 w-4 opacity-60" />{asset.label}</span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search assets (e.g. gold, NAS, SOL)…" />
                  <CommandList className="max-h-80">
                    <CommandEmpty>No asset found.</CommandEmpty>
                    {Object.entries(grouped).map(([cls, list]) => (
                      <CommandGroup key={cls} heading={cls}>
                        {list.map((a) => (
                          <CommandItem
                            key={a.symbol}
                            value={`${a.symbol} ${a.label}`}
                            onSelect={() => { setAsset(a); setPickerOpen(false); }}
                          >
                            <span className="font-mono text-xs w-24 text-muted-foreground">{a.symbol}</span>
                            <span className="ml-2">{a.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs">Stock ticker</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="AAPL"
                value={stockTicker}
                onChange={(e) => setStockTicker(e.target.value.toUpperCase())}
                className="w-32 uppercase"
              />
              <Button
                variant="secondary"
                disabled={!stockTicker.trim() || ensureMut.isPending}
                onClick={() => {
                  const a = stockAsset(stockTicker);
                  setAsset(a);
                  ensureMut.mutate(a);
                }}
              >Load</Button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => ensureMut.mutate(asset)}
            disabled={ensureMut.isPending}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", ensureMut.isPending && "animate-spin")} />
            Refresh now
          </Button>
        </CardContent>
      </Card>

      {/* Live Levels Dashboard */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl">{asset.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : isFetching ? "Loading…" : "No data yet — try Refresh now"}
                {" · Auto-refreshes every 10 min"}
              </p>
            </div>
            <Badge variant="outline" className={cn("uppercase tracking-wider", zoneClasses)}>{zone}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-3">
            <div className="font-display text-4xl font-bold tabular-nums">{fmt(price, digits)}</div>
            <div className="text-sm text-muted-foreground">Current price</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            <LevelPill label="Equilibrium" value={fmt(mid, digits)} tone="blue" />
            <LevelPill label="PDH" value={fmt(level?.pdh, digits)} />
            <LevelPill label="PDL" value={fmt(level?.pdl, digits)} />
            <LevelPill label="PWH" value={fmt(level?.pwh, digits)} />
            <LevelPill label="PWL" value={fmt(level?.pwl, digits)} />
            <LevelPill label="PMH" value={fmt(level?.pmh, digits)} />
            <LevelPill label="PML" value={fmt(level?.pml, digits)} />
            <LevelPill label="PQH" value={fmt(level?.pqh, digits)} />
            <LevelPill label="PQL" value={fmt(level?.pql, digits)} />
          </div>
        </CardContent>
      </Card>

      {/* ICT Setup Inputs */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">ICT Setup Confirmations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Higher-timeframe bias</Label>
              <div className="flex gap-2 mt-1">
                {(["bullish", "bearish", "ranging"] as const).map((b) => (
                  <Button key={b} size="sm" variant={bias === b ? "default" : "outline"} onClick={() => setBias(b)} className="flex-1 capitalize">{b}</Button>
                ))}
              </div>
            </div>
            <Toggle label="HTF Break of Structure (BOS)" value={htfBos} onChange={setHtfBos} />
            <Toggle label="LTF CHoCH / Market Structure Shift" value={ltfChoch} onChange={setLtfChoch} />
            <Toggle label="Liquidity sweep taken (EQH/EQL)" value={liquiditySweep} onChange={setLiquiditySweep} />
            <Toggle label="Order Block / Breaker in play" value={orderBlock} onChange={setOrderBlock} />
            <Toggle label="Fair Value Gap in confluence" value={fvg} onChange={setFvg} />
            <Toggle label="Inside kill zone / session window" value={killzone} onChange={setKillzone} />
            <div>
              <Label className="text-xs">Planned Risk : Reward</Label>
              <Input value={rr} onChange={(e) => setRr(e.target.value)} placeholder="2.5" className="mt-1 max-w-32" />
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => evalMut.mutate()}
              disabled={evalMut.isPending || !level}
            >
              <Sparkles className="h-4 w-4" />
              {evalMut.isPending ? "Evaluating…" : "Evaluate setup"}
            </Button>
            {!level && <p className="text-xs text-muted-foreground text-center">Load live levels above to evaluate.</p>}
          </CardContent>
        </Card>

        {/* Result */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Setup Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!eval_ ? (
              <p className="text-sm text-muted-foreground">Run an evaluation to see the setup score, ICT checklist, and AI explanation.</p>
            ) : (
              <>
                <ScoreDisplay score={eval_.score} rating={eval_.rating} />
                <div className="space-y-1.5">
                  {eval_.checks.map((c) => (
                    <div key={c.key} className="flex items-center gap-2 text-sm">
                      {c.ok
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                      <span className={cn(!c.ok && "text-muted-foreground")}>{c.key}</span>
                      <span className="ml-auto text-xs text-muted-foreground">+{c.weight}</span>
                    </div>
                  ))}
                </div>
                {eval_.nearest && (
                  <div className="text-xs text-muted-foreground">
                    Nearest key level: <span className="font-mono">{eval_.nearest.name}</span> @ {fmt(eval_.nearest.value, digits)} ({eval_.nearest.distancePct.toFixed(2)}% away)
                  </div>
                )}
                {eval_.explanation && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary-glow mb-1"><Sparkles className="h-3 w-3" /> AI explanation</div>
                    {eval_.explanation}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LevelPill({ label, value, tone }: { label: string; value: string; tone?: "blue" }) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2",
      tone === "blue" ? "border-blue-500/30 bg-blue-500/5" : "border-border/40",
    )}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2 cursor-pointer">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

function ScoreDisplay({ score, rating }: { score: number; rating: string }) {
  const tone =
    score >= 90 ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    : score >= 80 ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/5"
    : score >= 70 ? "text-blue-400 border-blue-500/30 bg-blue-500/5"
    : score >= 60 ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
    : "text-red-400 border-red-500/30 bg-red-500/5";
  return (
    <div className={cn("rounded-xl border p-4 flex items-center justify-between", tone)}>
      <div>
        <div className="text-xs uppercase tracking-wider opacity-80">Setup Score</div>
        <div className="font-display text-4xl font-bold tabular-nums">{score}<span className="text-lg opacity-60">/100</span></div>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-wider opacity-80">Rating</div>
        <div className="font-display text-xl font-semibold">{rating}</div>
      </div>
    </div>
  );
}