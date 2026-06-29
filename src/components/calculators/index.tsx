import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
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

function PositionSize() {
  const [bal, setBal] = useState("10000"); const [risk, setRisk] = useState("1");
  const [entry, setEntry] = useState("1.1000"); const [sl, setSl] = useState("1.0950");
  const riskAmt = num(bal) * (num(risk) / 100);
  const distance = Math.abs(num(entry) - num(sl));
  const units = distance > 0 ? riskAmt / distance : 0;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Account Balance ($)"><Input value={bal} onChange={(e) => setBal(e.target.value)} type="number" /></Field>
        <Field label="Risk %"><Input value={risk} onChange={(e) => setRisk(e.target.value)} type="number" step="0.1" /></Field>
        <Field label="Entry Price"><Input value={entry} onChange={(e) => setEntry(e.target.value)} type="number" step="any" /></Field>
        <Field label="Stop Loss"><Input value={sl} onChange={(e) => setSl(e.target.value)} type="number" step="any" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Risk Amount" value={`$${riskAmt.toFixed(2)}`} accent="destructive" />
        <Result label="Position Size (units)" value={units.toLocaleString(undefined, { maximumFractionDigits: 2 })} accent="primary" />
        <Result label="Standard Lots" value={(units / 100_000).toFixed(3)} />
      </div>
    </div>
  );
}

function RiskReward() {
  const [entry, setEntry] = useState("1.1000"); const [sl, setSl] = useState("1.0950"); const [tp, setTp] = useState("1.1150");
  const risk = Math.abs(num(entry) - num(sl)); const reward = Math.abs(num(tp) - num(entry));
  const rr = risk > 0 ? reward / risk : 0;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Entry"><Input value={entry} onChange={(e) => setEntry(e.target.value)} type="number" step="any" /></Field>
        <Field label="Stop Loss"><Input value={sl} onChange={(e) => setSl(e.target.value)} type="number" step="any" /></Field>
        <Field label="Take Profit"><Input value={tp} onChange={(e) => setTp(e.target.value)} type="number" step="any" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Risk" value={risk.toFixed(5)} accent="destructive" />
        <Result label="Reward" value={reward.toFixed(5)} accent="success" />
        <Result label="R:R Ratio" value={`1 : ${rr.toFixed(2)}`} accent="primary" />
      </div>
    </div>
  );
}

const PAIR_PIP: Record<string, number> = { "EUR/USD": 10, "GBP/USD": 10, "USD/JPY": 9.1, "AUD/USD": 10, "USD/CAD": 7.4, "USD/CHF": 11.2, "NZD/USD": 10, "EUR/JPY": 9.1, "GBP/JPY": 9.1, "XAU/USD": 10 };
function PipCalc() {
  const [pair, setPair] = useState("EUR/USD"); const [lots, setLots] = useState("1"); const [pips, setPips] = useState("10");
  const value = (PAIR_PIP[pair] ?? 10) * num(lots) * num(pips);
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Currency Pair">
          <Select value={pair} onValueChange={setPair}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(PAIR_PIP).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Lot Size (standard)"><Input value={lots} onChange={(e) => setLots(e.target.value)} type="number" step="0.01" /></Field>
        <Field label="Number of Pips"><Input value={pips} onChange={(e) => setPips(e.target.value)} type="number" step="0.1" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Pip Value (per lot)" value={`$${(PAIR_PIP[pair] ?? 10).toFixed(2)}`} />
        <Result label="Total Pip Value" value={`$${value.toFixed(2)}`} accent="primary" />
      </div>
    </div>
  );
}

function LotSize() {
  const [bal, setBal] = useState("10000"); const [risk, setRisk] = useState("1"); const [sl, setSl] = useState("20");
  const lots = num(sl) > 0 ? (num(bal) * (num(risk) / 100)) / (num(sl) * 10) : 0;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Account Balance ($)"><Input value={bal} onChange={(e) => setBal(e.target.value)} type="number" /></Field>
        <Field label="Risk %"><Input value={risk} onChange={(e) => setRisk(e.target.value)} type="number" step="0.1" /></Field>
        <Field label="Stop Loss (pips)"><Input value={sl} onChange={(e) => setSl(e.target.value)} type="number" step="0.1" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Recommended Lot Size" value={lots.toFixed(3)} accent="primary" />
        <Result label="Mini Lots" value={(lots * 10).toFixed(2)} />
        <Result label="Micro Lots" value={(lots * 100).toFixed(1)} />
      </div>
    </div>
  );
}

function Margin() {
  const [lev, setLev] = useState("100"); const [lots, setLots] = useState("1"); const [pair, setPair] = useState("EUR/USD");
  const contract = 100_000;
  const margin = num(lev) > 0 ? (num(lots) * contract) / num(lev) : 0;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Currency Pair">
          <Select value={pair} onValueChange={setPair}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(PAIR_PIP).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Leverage (1:X)"><Input value={lev} onChange={(e) => setLev(e.target.value)} type="number" /></Field>
        <Field label="Lot Size"><Input value={lots} onChange={(e) => setLots(e.target.value)} type="number" step="0.01" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Notional Value" value={`$${(num(lots) * contract).toLocaleString()}`} />
        <Result label="Margin Required" value={`$${margin.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent="primary" />
      </div>
    </div>
  );
}

function ProfitLoss() {
  const [entry, setEntry] = useState("1.1000"); const [exit, setExit] = useState("1.1100"); const [lots, setLots] = useState("1"); const [side, setSide] = useState<"buy" | "sell">("buy");
  const diff = (num(exit) - num(entry)) * (side === "buy" ? 1 : -1);
  const pnl = diff * num(lots) * 100_000;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Side">
          <Select value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="buy">Buy / Long</SelectItem><SelectItem value="sell">Sell / Short</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Entry"><Input value={entry} onChange={(e) => setEntry(e.target.value)} type="number" step="any" /></Field>
        <Field label="Exit"><Input value={exit} onChange={(e) => setExit(e.target.value)} type="number" step="any" /></Field>
        <Field label="Lot Size"><Input value={lots} onChange={(e) => setLots(e.target.value)} type="number" step="0.01" /></Field>
      </div>
      <div className="space-y-3">
        <Result label="Price Movement" value={diff.toFixed(5)} />
        <Result label="Profit / Loss" value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`} accent={pnl >= 0 ? "success" : "destructive"} />
      </div>
    </div>
  );
}

function Compounding() {
  const [bal, setBal] = useState("1000"); const [growth, setGrowth] = useState("5"); const [months, setMonths] = useState("12");
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
        <Field label="Starting Balance ($)"><Input value={bal} onChange={(e) => setBal(e.target.value)} type="number" /></Field>
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
  return (
    <Tabs defaultValue="position" className="w-full">
      <TabsList className="flex flex-wrap h-auto glass p-1">
        <TabsTrigger value="position">Position Size</TabsTrigger>
        <TabsTrigger value="rr">Risk / Reward</TabsTrigger>
        <TabsTrigger value="pip">Pip Value</TabsTrigger>
        <TabsTrigger value="lot">Lot Size</TabsTrigger>
        <TabsTrigger value="margin">Margin</TabsTrigger>
        <TabsTrigger value="pl">Profit / Loss</TabsTrigger>
        <TabsTrigger value="compound">Compounding</TabsTrigger>
      </TabsList>
      <div className="glass-strong rounded-2xl p-6 mt-4">
        <TabsContent value="position"><PositionSize /></TabsContent>
        <TabsContent value="rr"><RiskReward /></TabsContent>
        <TabsContent value="pip"><PipCalc /></TabsContent>
        <TabsContent value="lot"><LotSize /></TabsContent>
        <TabsContent value="margin"><Margin /></TabsContent>
        <TabsContent value="pl"><ProfitLoss /></TabsContent>
        <TabsContent value="compound"><Compounding /></TabsContent>
      </div>
    </Tabs>
  );
}