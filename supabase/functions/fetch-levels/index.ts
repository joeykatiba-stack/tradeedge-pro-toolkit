import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

// Universal watchlist: { symbol (canonical UI), td (Twelve Data ticker), assetClass }
type Entry = { symbol: string; td: string; assetClass: string };
const WATCHLIST: Entry[] = [
  // Forex majors
  { symbol: "EUR/USD", td: "EUR/USD", assetClass: "Forex" },
  { symbol: "GBP/USD", td: "GBP/USD", assetClass: "Forex" },
  { symbol: "USD/JPY", td: "USD/JPY", assetClass: "Forex" },
  { symbol: "AUD/USD", td: "AUD/USD", assetClass: "Forex" },
  { symbol: "NZD/USD", td: "NZD/USD", assetClass: "Forex" },
  { symbol: "USD/CAD", td: "USD/CAD", assetClass: "Forex" },
  { symbol: "USD/CHF", td: "USD/CHF", assetClass: "Forex" },
  { symbol: "EUR/GBP", td: "EUR/GBP", assetClass: "Forex" },
  { symbol: "EUR/JPY", td: "EUR/JPY", assetClass: "Forex" },
  { symbol: "GBP/JPY", td: "GBP/JPY", assetClass: "Forex" },
  // Metals
  { symbol: "XAU/USD", td: "XAU/USD", assetClass: "Metals" },
  { symbol: "XAG/USD", td: "XAG/USD", assetClass: "Metals" },
  // Indices
  { symbol: "US30", td: "DJI", assetClass: "Indices" },
  { symbol: "NAS100", td: "NDX", assetClass: "Indices" },
  { symbol: "SPX500", td: "SPX", assetClass: "Indices" },
  { symbol: "DAX40", td: "DAX", assetClass: "Indices" },
  { symbol: "FTSE100", td: "UKX", assetClass: "Indices" },
  { symbol: "Nikkei225", td: "N225", assetClass: "Indices" },
  // Commodities
  { symbol: "WTI", td: "WTI/USD", assetClass: "Commodities" },
  { symbol: "BRENT", td: "BRENT/USD", assetClass: "Commodities" },
  { symbol: "NATGAS", td: "NG/USD", assetClass: "Commodities" },
  // Crypto
  { symbol: "BTC/USD", td: "BTC/USD", assetClass: "Crypto" },
  { symbol: "ETH/USD", td: "ETH/USD", assetClass: "Crypto" },
  { symbol: "SOL/USD", td: "SOL/USD", assetClass: "Crypto" },
  { symbol: "XRP/USD", td: "XRP/USD", assetClass: "Crypto" },
  { symbol: "BNB/USD", td: "BNB/USD", assetClass: "Crypto" },
  { symbol: "ADA/USD", td: "ADA/USD", assetClass: "Crypto" },
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

function quarterOf(date: Date): { year: number; q: number } {
  return { year: date.getUTCFullYear(), q: Math.floor(date.getUTCMonth() / 3) };
}

function prevQuarterHiLo(months: Candle[]): { high: number | null; low: number | null } {
  // Group last ~9 monthly candles by (year, quarter); pick the most recent COMPLETED quarter.
  if (!months?.length) return { high: null, low: null };
  const now = new Date();
  const cur = quarterOf(now);
  const buckets = new Map<string, Candle[]>();
  for (const m of months) {
    const d = new Date(m.datetime);
    if (isNaN(d.getTime())) continue;
    const q = quarterOf(d);
    if (q.year > cur.year || (q.year === cur.year && q.q >= cur.q)) continue; // skip current
    const key = `${q.year}-${q.q}`;
    const list = buckets.get(key) ?? [];
    list.push(m);
    buckets.set(key, list);
  }
  const keys = [...buckets.keys()].sort().reverse();
  if (!keys.length) return { high: null, low: null };
  const target = buckets.get(keys[0])!;
  let hi = -Infinity, lo = Infinity;
  for (const c of target) {
    hi = Math.max(hi, Number(c.high));
    lo = Math.min(lo, Number(c.low));
  }
  return { high: isFinite(hi) ? hi : null, low: isFinite(lo) ? lo : null };
}

async function processEntry(entry: Entry) {
  const s = entry.td;
  const [daily, weekly, monthly, quote] = await Promise.all([
    td("time_series", { symbol: s, interval: "1day", outputsize: "3" }),
    td("time_series", { symbol: s, interval: "1week", outputsize: "2" }),
    td("time_series", { symbol: s, interval: "1month", outputsize: "9" }),
    td("price", { symbol: s }),
  ]);
  const dValues: Candle[] = daily?.values ?? [];
  const wValues: Candle[] = weekly?.values ?? [];
  const mValues: Candle[] = monthly?.values ?? [];
  if (dValues.length < 2 || wValues.length < 1) {
    throw new Error(`Insufficient data for ${entry.symbol}: ${JSON.stringify({ daily, weekly })}`);
  }
  const today = dValues[0];
  const prevDay = dValues[1];
  const prevWeek = wValues[1] ?? wValues[0];
  const prevMonth = mValues[1] ?? mValues[0] ?? null;
  const price = Number(quote?.price ?? today.close);
  const dayHigh = Number(today.high);
  const dayLow = Number(today.low);
  const midpoint = (dayHigh + dayLow) / 2;
  const pq = prevQuarterHiLo(mValues);

  return {
    symbol: entry.symbol,
    asset_class: entry.assetClass,
    pdh: Number(prevDay.high),
    pdl: Number(prevDay.low),
    pwh: Number(prevWeek.high),
    pwl: Number(prevWeek.low),
    pmh: prevMonth ? Number(prevMonth.high) : null,
    pml: prevMonth ? Number(prevMonth.low) : null,
    pqh: pq.high,
    pql: pq.low,
    premium_discount_midpoint: midpoint,
    equilibrium: midpoint,
    round_numbers: roundNumbersNear(price),
    current_price: price,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Require either the cron shared-secret header or a service-role bearer token.
    const cronSecret = Deno.env.get("FETCH_LEVELS_CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const providedSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const hasCronSecret = !!cronSecret && !!providedSecret && providedSecret === cronSecret;
    const hasServiceRole = !!serviceRoleKey && !!bearer && bearer === serviceRoleKey;
    if (!hasCronSecret && !hasServiceRole) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional: fetch a single ad-hoc symbol (e.g. a stock ticker) instead of the full watchlist.
    let payload: { symbol?: string; td?: string; assetClass?: string } = {};
    try { if (req.method === "POST") payload = await req.json(); } catch { /* empty body ok */ }
    if (payload?.symbol) {
      const entry: Entry = {
        symbol: payload.symbol,
        td: payload.td || payload.symbol,
        assetClass: payload.assetClass || "Stocks",
      };
      try {
        const row = await processEntry(entry);
        const { error } = await supabase.from("price_levels").upsert(row, { onConflict: "symbol" });
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, row }), {
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 502,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

    const results: { symbol: string; ok: boolean; error?: string }[] = [];
    for (const entry of WATCHLIST) {
      try {
        const row = await processEntry(entry);
        const { error } = await supabase.from("price_levels").upsert(row, { onConflict: "symbol" });
        if (error) throw error;
        results.push({ symbol: entry.symbol, ok: true });
      } catch (e) {
        console.error(`[fetch-levels] ${entry.symbol}`, e);
        results.push({ symbol: entry.symbol, ok: false, error: String(e) });
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