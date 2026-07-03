import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/tools/structure-analysis")({
  head: () => ({
    meta: [
      { title: "Market Structure Analysis — TradeEdge Toolkit" },
      { name: "description", content: "Upload a chart screenshot and get AI-powered SMC analysis: trend, BOS/CHoCH, swing levels, and bias." },
    ],
  }),
  component: StructurePage,
});

const TIMEFRAMES = ["1M", "1W", "1D", "4H", "1H", "30m", "15m", "5m", "1m"] as const;

type AnalysisResult = {
  trend: "bullish" | "bearish" | "ranging";
  last_event: { type: "BOS" | "CHoCH" | "none"; direction: "bullish" | "bearish" | "none"; note: string };
  swing_high: { price: number | null; note: string };
  swing_low: { price: number | null; note: string };
  bias: "bullish" | "bearish" | "ranging";
  confidence: "low" | "medium" | "high";
  reasoning: string;
};

type Row = {
  id: string;
  symbol: string | null;
  timeframe: string;
  image_url: string;
  result_json: AnalysisResult;
  created_at: string;
};

function StructurePage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [timeframe, setTimeframe] = useState<string>("4H");
  const [symbol, setSymbol] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterTf, setFilterTf] = useState<string>("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["structure_analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("structure_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  const filtered = filterTf === "all" ? rows : rows.filter((r) => r.timeframe === filterTf);
  const available = Array.from(new Set(rows.map((r) => r.timeframe)));

  async function analyze() {
    if (!file) return toast.error("Choose a chart screenshot");
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");

      const ext = file.name.split(".").pop() ?? "png";
      const storagePath = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chart-screenshots")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-structure`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storagePath, timeframe, symbol: symbol || null }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Analyze failed (${res.status})`);
      }
      toast.success("Analysis complete");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["structure_analysis"] });
      qc.invalidateQueries({ queryKey: ["entry_check_inputs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <header className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Market Structure Analysis</h1>
          <p className="text-muted-foreground mt-1">Upload a chart. Get trend, BOS/CHoCH, swings, and bias in seconds.</p>
        </div>
      </header>

      <Card className="glass mb-8">
        <CardHeader><CardTitle>New Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Symbol (optional)</Label>
              <Input className="mt-1" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="EUR/USD" />
            </div>
            <div>
              <Label>Screenshot</Label>
              <Input className="mt-1" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <Button onClick={analyze} disabled={uploading || !file} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Analyzing…" : "Analyze"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 className="font-display text-xl font-semibold">History</h2>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Timeframe</Label>
          <Select value={filterTf} onValueChange={setFilterTf}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {TIMEFRAMES.filter((t) => available.includes(t)).map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">
            {rows.length === 0 ? "No analyses yet." : "No analyses match this timeframe."}
          </p>
        ) : (
          filtered.map((r) => <AnalysisCard key={r.id} row={r} />)
        )}
      </div>
    </div>
  );
}

function AnalysisCard({ row }: { row: Row }) {
  const r = row.result_json;
  const trendIcon = r.bias === "bullish" ? <TrendingUp className="h-4 w-4" /> : r.bias === "bearish" ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />;
  const biasColor =
    r.bias === "bullish" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : r.bias === "bearish" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : "bg-muted text-muted-foreground";
  return (
    <Card className="glass overflow-hidden">
      <a href={row.image_url} target="_blank" rel="noreferrer">
        <img src={row.image_url} alt="chart" className="w-full h-40 object-cover border-b border-border/40" />
      </a>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display">
            {row.symbol ?? "Chart"} <span className="text-muted-foreground text-sm">· {row.timeframe}</span>
          </CardTitle>
          <Badge variant="outline" className={biasColor}>{trendIcon}<span className="ml-1">{r.bias}</span></Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2 text-sm">
        <Kv k="Trend" v={r.trend} />
        <Kv k="Last event" v={`${r.last_event.type} · ${r.last_event.direction}`} />
        <Kv k="Swing high" v={r.swing_high.price != null ? String(r.swing_high.price) : "—"} />
        <Kv k="Swing low" v={r.swing_low.price != null ? String(r.swing_low.price) : "—"} />
        <Kv k="Confidence" v={r.confidence} />
        <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">{r.reasoning}</p>
      </CardContent>
    </Card>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}