import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertTrade } from "@/lib/trades.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function num(v: string, d = 0) { const n = parseFloat(v); return Number.isFinite(n) ? n : d; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function Result({ label, value, accent }: { label: string; value: string; accent?: "success" | "destructive" | "primary" }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("font-display text-2xl font-bold mt-1",
        accent === "success" && "text-success",
        accent === "destructive" && "text-destructive",
        accent === "primary" && "text-gradient-primary")}>{value}</div>
    </div>
  );
}

// ---- Instrument catalog ----
// `multiplier` = dollars of P/L per 1.00 unit of price movement, for ONE standard unit
// (1 standard lot for forex, 1 contract for futures, 1 share for stocks, 1 coin for crypto).
// notional value of a position = quantity * price * multiplier
type AssetCategory = "forex" | "futures" | "crypto" | "stocks";

type Instrument = { symbol: string; multiplier: number; decimals: number };

const CATALOG: Record<Exclude<AssetCategory, "stocks">, Instrument[]> = {
  forex: [
    { symbol: "EUR/USD", multiplier: 100000, decimals: 5 },
    { symbol: "GBP/USD", multiplier: 100000, decimals: 5 },
    { symbol: "USD/JPY", multiplier: 910, decimals: 3 },
    { symbol: "AUD/USD", multiplier: 100000, decimals: 5 },
    { symbol: "USD/CAD", multiplier: 74000, decimals: 5 },
    { symbol: "USD/CHF", multiplier: 112000, decimals: 5 },
    { symbol: "NZD/USD", multiplier: 100000, decimals: 5 },
    { symbol: "EUR/JPY", multiplier: 910, decimals: 3 },
    { symbol: "GBP/JPY", multiplier: 910, decimals: 3 },
    { symbol: "XAU/USD", multiplier: 1000, decimals: 2 },
  ],
  futures: [
    { symbol: "ES (S&P 500)", multiplier: 50, decimals: 2 },
    { symbol: "NQ (Nasdaq 100)", multiplier: 20, decimals: 2 },
    { symbol: "YM (Dow)", multiplier: 5, decimals: 0 },
    { symbol: "CL (Crude Oil)", multiplier: 1000, decimals: 2 },
    { symbol: "GC (Gold)", multiplier: 100, decimals: 1 },
    { symbol: "6E (Euro FX)", multiplier: 125000, decimals: 5 },
  ],
  crypto: [
    { symbol: "BTC/USD", multiplier: 1, decimals: 2 },
    { symbol: "ETH/USD", multiplier: 1, decimals: 2 },
    { symbol: "SOL/USD", multiplier: 1, decimals: 3 },
    { symbol: "XRP/USD", multiplier: 1, decimals: 4 },
    { symbol: "BNB/USD", multiplier: 1, decimals: 2 },
  ],
};

const QUANTITY_LABEL: Record<AssetCategory, string> = {
  forex: "Standard Lots",
  futures: "Contracts",
  crypto: "Coins / Units",
  stocks: "Shares",
};

function getInstrument(category: AssetCategory, symbol: string): Instrument {
  if (category === "stocks") return { symbol: symbol || "TICKER", multiplier: 1, decimals: 2 };
  const found = CATALOG[category].find((i) => i.symbol === symbol);
  return found ?? CATALOG[category][0];
}

// ---- Shared state lifted to the top level so every calculator + the instrument bar reads/writes the same values ----
type Shared = {
  category: AssetCategory;
  pair: string; // symbol for forex/futures/crypto, free-text ticker for stocks
  accountBalance: string;
  riskPercent: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  lotSize: string; // quantity in the instrument's native unit (lots/contracts/coins/shares)
  side: "buy" | "sell";
};

const defaultShared: Shared = {
  category: "forex",
  pair: "EUR/USD",
  accountBalance: "10000",
  riskPercent: "1",
  entryPrice: "1.1000",
  stopLoss: "1.0950",
  takeProfit: "1.1150",
  lotSize: "1",
  side: "buy",
};

const STORAGE_KEY = "tradeedge_calculators_state_v1";

type SetShared = (patch: Partial<Shared>) => void;

function useJournalSave() {
  const qc = useQueryClient();
  const save = useServerFn(upsertTrade);
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => save({ data: input as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Saved to journal");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save trade"),
  });
}

function SaveButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <Button type="button" onClick={onClick} disabled={pending}
      className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
      {pending ? "Saving..." : "Save to Journal"}
    </Button>
  );
}

// ---- Instrument bar shown above every calculator ----
function InstrumentBar({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const categories: AssetCategory[] = ["forex", "futures", "crypto", "stocks"];
  return (
    <div className="glass-strong rounded-2xl p-4 mb-4 grid md:grid-cols-2 gap-4">
      <Field label="Asset Class">
        <Select value={shared.category} onValueChange={(v) => {
          const cat = v as AssetCategory;
          const firstSymbol = cat === "stocks" ? "" : CATALOG[cat][0].symbol;
          setShared({ category: cat, pair: firstSymbol });
        }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      {shared.category === "stocks" ? (
        <Field label="Ticker Symbol">
          <Input value={shared.pair} onChange={(e) => setShared({ pair: e.target.value.toUpperCase() })} placeholder="e.g. AAPL" />
        </Field>
      ) : (
        <Field label="Instrument">
          <Select value={shared.pair} onValueChange={(v) => setShared({ pair: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATALOG[shared.category].map((i) => <SelectItem key={i.symbol} value={i.symbol}>{i.symbol}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

function PositionSize({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const instrument = getInstrument(shared.category, shared.pair);
  const { accountBalance: bal, riskPercent: risk, entryPrice: entry, stopLoss: sl } = shared;
  const riskAmt = num(bal) * (num(risk) / 100);
  const distance = Math.abs(num(entry) - num(sl));
  const quantity = distance > 0 ? riskAmt / (distance * instrument.multiplier) : 0;

  const journal = useJournalSave();
  const save = () => journal.mutate({
    pair: shared.pair, side: shared.side,
    entry: num(entry), stop_loss: num(sl) || null, take_profit: num(shared.takeProfit) || null,
    lot_size: Number(quantity.toFixed(4)) || null,
    notes: `Position Size calc (${shared.category}) — risk $${riskAmt.toFixed(2)}`,
    opened_at: new Date().toISOString(),
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Account Balance ($)"><Input value={bal} onChange={(e) => setShared({ accountBalance: e.target.value })} type="number" /></Field>
        <Field label="Risk %"><Input value={risk} onChange={(e) => setShared({ riskPercent: e.target.value })} type="number" step="0.1" /></Field>
        <Field label="Entry Price"><Input value={entry} onChange={(e) => setShared({ entryPrice: e.target.value })} type="number" step="any" /></Field>
        <Field label="Stop Loss"><Input value={sl} onChange={(e) => setShared({ stopLoss: e.target.value })} type="number" step="any" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Risk Amount" value={`$${riskAmt.toFixed(2)}`} accent="destructive" />
        <Result label={QUANTITY_LABEL[shared.category]} value={quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} accent="primary" />
        <Result label="Notional Value" value={`$${(quantity * num(entry) * instrument.multiplier).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <SaveButton onClick={save} pending={journal.isPending} />
      </div>
    </div>
  );
}

function RiskReward({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const { entryPrice: entry, stopLoss: sl, takeProfit: tp } = shared;
  const risk = Math.abs(num(entry) - num(sl));
  const reward = Math.abs(num(tp) - num(entry));
  const rr = risk > 0 ? reward / risk : 0;
  const instrument = getInstrument(shared.category, shared.pair);

  const journal = useJournalSave();
  const save = () => journal.mutate({
    pair: shared.pair, side: shared.side,
    entry: num(entry), stop_loss: num(sl) || null, take_profit: num(tp) || null,
    lot_size: num(shared.lotSize) || null,
    notes: `Risk/Reward calc (${shared.category}) — R:R 1:${rr.toFixed(2)}`,
    opened_at: new Date().toISOString(),
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Entry"><Input value={entry} onChange={(e) => setShared({ entryPrice: e.target.value })} type="number" step="any" /></Field>
        <Field label="Stop Loss"><Input value={sl} onChange={(e) => setShared({ stopLoss: e.target.value })} type="number" step="any" /></Field>
        <Field label="Take Profit"><Input value={tp} onChange={(e) => setShared({ takeProfit: e.target.value })} type="number" step="any" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Risk" value={risk.toFixed(instrument.decimals)} accent="destructive" />
        <Result label="Reward" value={reward.toFixed(instrument.decimals)} accent="success" />
        <Result label="R:R Ratio" value={`1 : ${rr.toFixed(2)}`} accent="primary" />
        <SaveButton onClick={save} pending={journal.isPending} />
      </div>
    </div>
  );
}

function PointValue({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const instrument = getInstrument(shared.category, shared.pair);
  const { lotSize: qty } = shared;
  const [priceMove, setPriceMove] = useState("0.0010");
  const value = instrument.multiplier * num(qty) * num(priceMove);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label={QUANTITY_LABEL[shared.category]}>
          <Input value={qty} onChange={(e) => setShared({ lotSize: e.target.value })} type="number" step="0.0001" />
        </Field>
        <Field label={`Price Move (in ${shared.pair || "instrument"} price units)`}>
          <Input value={priceMove} onChange={(e) => setPriceMove(e.target.value)} type="number" step="any" />
        </Field>
      </div>
      <div className="space-y-3">
        <Result label="Value per 1.00 Move (per unit)" value={`$${instrument.multiplier.toLocaleString()}`} />
        <Result label="Total Value of Move" value={`$${value.toFixed(2)}`} accent="primary" />
      </div>
    </div>
  );
}

function SizeByStopDistance({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const instrument = getInstrument(shared.category, shared.pair);
  const { accountBalance: bal, riskPercent: risk } = shared;
  const [distance, setDistance] = useState("0.0050");
  const quantity = num(distance) > 0 ? (num(bal) * (num(risk) / 100)) / (num(distance) * instrument.multiplier) : 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Account Balance ($)"><Input value={bal} onChange={(e) => setShared({ accountBalance: e.target.value })} type="number" /></Field>
        <Field label="Risk %"><Input value={risk} onChange={(e) => setShared({ riskPercent: e.target.value })} type="number" step="0.1" /></Field>
        <Field label="Stop Distance (price units)"><Input value={distance} onChange={(e) => setDistance(e.target.value)} type="number" step="any" /></Field>
      </div>
      <div className="space-y-3">
        <Result label={`Recommended ${QUANTITY_LABEL[shared.category]}`} value={quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} accent="primary" />
        <Button type="button" variant="outline" className="w-full" onClick={() => setShared({ lotSize: quantity.toFixed(4) })}>
          Use this size everywhere
        </Button>
      </div>
    </div>
  );
}

function Margin({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const instrument = getInstrument(shared.category, shared.pair);
  const { entryPrice: price, lotSize: qty } = shared;
  const [lev, setLev] = useState("100");
  const notional = num(qty) * num(price) * instrument.multiplier;
  const margin = num(lev) > 0 ? notional / num(lev) : 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Reference Price"><Input value={price} onChange={(e) => setShared({ entryPrice: e.target.value })} type="number" step="any" /></Field>
        <Field label="Leverage (1:X)"><Input value={lev} onChange={(e) => setLev(e.target.value)} type="number" /></Field>
        <Field label={QUANTITY_LABEL[shared.category]}><Input value={qty} onChange={(e) => setShared({ lotSize: e.target.value })} type="number" step="0.0001" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Notional Value" value={`$${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Result label="Margin Required" value={`$${margin.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent="primary" />
      </div>
    </div>
  );
}

function ProfitLoss({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const instrument = getInstrument(shared.category, shared.pair);
  const { entryPrice: entry, lotSize: qty, side } = shared;
  const [exit, setExit] = useState("1.1100");
  const diff = (num(exit) - num(entry)) * (side === "buy" ? 1 : -1);
  const pnl = diff * num(qty) * instrument.multiplier;

  const journal = useJournalSave();
  const save = () => journal.mutate({
    pair: shared.pair, side,
    entry: num(entry), exit: num(exit) || null,
    stop_loss: num(shared.stopLoss) || null, take_profit: num(shared.takeProfit) || null,
    lot_size: num(qty) || null, pnl: Number(pnl.toFixed(2)),
    notes: `Closed via Profit/Loss calculator (${shared.category})`,
    opened_at: new Date().toISOString(),
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Side">
          <Select value={side} onValueChange={(v) => setShared({ side: v as "buy" | "sell" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="buy">Buy / Long</SelectItem><SelectItem value="sell">Sell / Short</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Entry"><Input value={entry} onChange={(e) => setShared({ entryPrice: e.target.value })} type="number" step="any" /></Field>
        <Field label="Exit"><Input value={exit} onChange={(e) => setExit(e.target.value)} type="number" step="any" /></Field>
        <Field label={QUANTITY_LABEL[shared.category]}><Input value={qty} onChange={(e) => setShared({ lotSize: e.target.value })} type="number" step="0.0001" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Price Movement" value={diff.toFixed(instrument.decimals)} />
        <Result label="Profit / Loss" value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`} accent={pnl >= 0 ? "success" : "destructive"} />
        <SaveButton onClick={save} pending={journal.isPending} />
      </div>
    </div>
  );
}

function Compounding({ shared, setShared }: { shared: Shared; setShared: SetShared }) {
  const { accountBalance: bal } = shared;
  const [growth, setGrowth] = useState("5"); const [months, setMonths] = useState("12");
  const data = useMemo(() => {
    const out: { month: string; balance: number }[] = [];
    let v = num(bal);
    const r = num(growth) / 100;
    const m = Math.max(0, Math.min(60, Math.round(num(months))));
    out.push({ month: "0", balance: v });
    for (let i = 1; i <= m; i++) { v = v * (1 + r); out.push({ month: String(i), balance: Math.round(v * 100) / 100 }); }
    return out;
  }, [bal, growth, months]);
  const final = data[data.length - 1]?.balance ?? 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Starting Balance ($)"><Input value={bal} onChange={(e) => setShared({ accountBalance: e.target.value })} type="number" /></Field>
        <Field label="Monthly Growth %"><Input value={growth} onChange={(e) => setGrowth(e.target.value)} type="number" step="0.1" /></Field>
        <Field label="Months (max 60)"><Input value={months} onChange={(e) => setMonths(e.target.value)} type="number" /></Field>
        <Result label="Final Balance" value={`$${final.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent="primary" />
        <Result label="Total Gain" value={`+$${(final - num(bal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent="success" />
      </div>
      <div className="glass rounded-xl p-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" stroke="oklch(0.7 0.025 255)" fontSize={11} />
            <YAxis stroke="oklch(0.7 0.025 255)" fontSize={11} />
            <Tooltip contentStyle={{ background: "oklch(0.2 0.03 260)", border: "1px solid oklch(0.3 0.03 260)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="balance" stroke="oklch(0.58 0.22 262)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Calculators() {
  const [shared, setSharedState] = useState<Shared>(() => {
    if (typeof window === "undefined") return defaultShared;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultShared, ...JSON.parse(raw) } : defaultShared;
    } catch {
      return defaultShared;
    }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shared)); } catch { /* ignore quota errors */ }
  }, [shared]);

  const setShared: SetShared = (patch) => setSharedState((s) => ({ ...s, ...patch }));

  return (
    <div>
      <InstrumentBar shared={shared} setShared={setShared} />
      <Tabs defaultValue="position" className="w-full">
        <TabsList className="flex flex-wrap h-auto glass p-1">
          <TabsTrigger value="position">Position Size</TabsTrigger>
          <TabsTrigger value="rr">Risk / Reward</TabsTrigger>
          <TabsTrigger value="point">Point Value</TabsTrigger>
          <TabsTrigger value="size">Size by Stop</TabsTrigger>
          <TabsTrigger value="margin">Margin</TabsTrigger>
          <TabsTrigger value="pl">Profit / Loss</TabsTrigger>
          <TabsTrigger value="compound">Compounding</TabsTrigger>
        </TabsList>
        <div className="glass-strong rounded-2xl p-6 mt-4">
          <TabsContent value="position"><PositionSize shared={shared} setShared={setShared} /></TabsConte
