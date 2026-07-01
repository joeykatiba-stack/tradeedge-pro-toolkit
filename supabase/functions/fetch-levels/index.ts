// Fetches OHLC from Twelve Data for a fixed watchlist and upserts computed
// price_levels rows (PDH/PDL/PWH/PWL, premium/discount midpoint, round numbers).
// Triggered on a 1-minute schedule via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const WATCHLIST = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "XAU/USD",
  "BTC/USD",
  "ETH/USD",
];

type Candle = { datetime: string; open: string; high: string; low: string; close: string };

async function td(path: string, params: Record<string, string>) {
  const apiKey = Deno.env.get("TWELVE_DATA_API_KEY")!;
  const url = new URL(`https://api.twelvedata.com/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Twelve Data ${path} ${res.status}`);
  return res.json();
}

function roundNumbersNear(price: number): number[] {
  if (!isFinite(price) || price <= 0) return [];
  const mag = Math.pow(10, Math.floor(Math.log10(price)));
  const step = mag / 10; // one order of magnitude below price
  const base = Math.round(price / step) * step;
  const out = [base - 2 * step, base - step, base, base + step, base + 2 * step]
    .map((n) => Number(n.toFixed(6)))
    .filter((n) => n > 0);
  return out;
}

async function processSymbol(symbol: string) {
  const [daily, weekly, quote] = await Promise.all([
    td("time_series", { symbol, interval: "1day", outputsize: "3" }),
    td("time_series", { symbol, interval: "1week", outputsize: "2" }),
    td("price", { symbol }),
  ]);
  const dValues: Candle[] = daily?.values ?? [];
  const wValues: Candle[] = weekly?.values ?? [];
  if (dValues.length < 2 || wValues.length < 1) {
    throw new Error(`Insufficient data for ${symbol}: ${JSON.stringify({ daily, weekly })}`);
  }
  const today = dValues[0];
  const prevDay = dValues[1];
  const prevWeek = wValues[1] ?? wValues[0];
  const price = Number(quote?.price ?? today.close);
  const dayHigh = Number(today.high);
  const dayLow = Number(today.low);
  const midpoint = (dayHigh + dayLow) / 2;

  return {
    symbol,
    pdh: Number(prevDay.high),
    pdl: Number(prevDay.low),
    pwh: Number(prevWeek.high),
    pwl: Number(prevWeek.low),
    premium_discount_midpoint: midpoint,
    round_numbers: roundNumbersNear(price),
    current_price: price,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const results: { symbol: string; ok: boolean; error?: string }[] = [];
    for (const symbol of WATCHLIST) {
      try {
        const row = await processSymbol(symbol);
        const { error } = await supabase.from("price_levels").upsert(row, { onConflict: "symbol" });
        if (error) throw error;
        results.push({ symbol, ok: true });
      } catch (e) {
        console.error(`[fetch-levels] ${symbol}`, e);
        results.push({ symbol, ok: false, error: String(e) });
      }
    }
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[fetch-levels]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});