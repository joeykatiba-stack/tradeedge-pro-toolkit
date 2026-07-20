import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LevelRow = {
  symbol: string;
  current_price: number | null;
  pdh: number | null; pdl: number | null;
  pwh: number | null; pwl: number | null;
  pmh: number | null; pml: number | null;
  pqh: number | null; pql: number | null;
  equilibrium: number | null;
  premium_discount_midpoint: number | null;
};

type EvalInput = {
  symbol: string;
  bias: "bullish" | "bearish" | "ranging";
  htf_bos: boolean;
  ltf_choch: boolean;
  liquidity_sweep: boolean;
  order_block_present: boolean;
  fvg_present: boolean;
  in_killzone: boolean;
  rr: number; // planned risk:reward, e.g. 2.5
  levels: LevelRow;
};

// Ensure the on-demand ticker exists in price_levels by asking the fetch-levels
// edge function to fetch and upsert it. Idempotent.
export const ensureLevelsForSymbol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { symbol: string; td?: string; assetClass?: string }) => i)
  .handler(async ({ data }) => {
    const url = `${process.env.SUPABASE_URL}/functions/v1/fetch-levels`;
    const secret = process.env.FETCH_LEVELS_CRON_SECRET;
    const bearer = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {}),
        authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`fetch-levels ${res.status}: ${text}`);
    }
    return await res.json();
  });

function zoneFor(price: number | null, mid: number | null): "premium" | "discount" | "equilibrium" | "unknown" {
  if (price == null || mid == null) return "unknown";
  const d = (price - mid) / mid;
  if (Math.abs(d) < 0.0007) return "equilibrium";
  return price > mid ? "premium" : "discount";
}

function nearestKeyLevel(price: number, l: LevelRow): { name: string; value: number; distancePct: number } | null {
  const cands: [string, number | null][] = [
    ["PDH", l.pdh], ["PDL", l.pdl],
    ["PWH", l.pwh], ["PWL", l.pwl],
    ["PMH", l.pmh], ["PML", l.pml],
    ["PQH", l.pqh], ["PQL", l.pql],
  ];
  let best: { name: string; value: number; distancePct: number } | null = null;
  for (const [name, v] of cands) {
    if (v == null) continue;
    const dist = Math.abs((price - v) / price) * 100;
    if (!best || dist < best.distancePct) best = { name, value: v, distancePct: dist };
  }
  return best;
}

// Deterministic 0-100 setup quality score using ICT weightings.
export const evaluateEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: EvalInput) => i)
  .handler(async ({ data }) => {
    const l = data.levels;
    const price = l.current_price ?? 0;
    const mid = l.equilibrium ?? l.premium_discount_midpoint;
    const zone = zoneFor(price, mid);
    const near = nearestKeyLevel(price, l);
    const direction = data.bias;

    const zoneOk =
      (direction === "bullish" && zone === "discount") ||
      (direction === "bearish" && zone === "premium");
    const nearLevelOk = !!near && near.distancePct < 0.25;
    const rrOk = data.rr >= 2;

    const checks = [
      { key: "HTF bias defined", ok: direction !== "ranging", weight: 10 },
      { key: "HTF BOS confirmed", ok: data.htf_bos, weight: 15 },
      { key: "LTF CHoCH / MSS", ok: data.ltf_choch, weight: 12 },
      { key: "Liquidity sweep taken", ok: data.liquidity_sweep, weight: 12 },
      { key: "Order block in play", ok: data.order_block_present, weight: 10 },
      { key: "Fair value gap present", ok: data.fvg_present, weight: 8 },
      { key: "Premium/Discount alignment", ok: zoneOk, weight: 12 },
      { key: "Reacting at key level", ok: nearLevelOk, weight: 10 },
      { key: "Kill zone / session context", ok: data.in_killzone, weight: 6 },
      { key: "Risk:Reward ≥ 1:2", ok: rrOk, weight: 5 },
    ];
    const score = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);

    const rating =
      score >= 90 ? "Excellent"
      : score >= 80 ? "High Probability"
      : score >= 70 ? "Good"
      : score >= 60 ? "Average"
      : "Avoid";

    // AI explanation via Lovable AI Gateway
    let explanation = "";
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (apiKey) {
        const passed = checks.filter((c) => c.ok).map((c) => c.key);
        const failed = checks.filter((c) => !c.ok).map((c) => c.key);
        const prompt =
          `You are an institutional ICT trading coach. In 3-4 short sentences, explain why this ${data.symbol} setup scored ${score}/100 (${rating}). ` +
          `Direction: ${direction}. Zone: ${zone}. Nearest key level: ${near ? `${near.name} @ ${near.value} (${near.distancePct.toFixed(2)}%)` : "none"}. ` +
          `Planned R:R = ${data.rr}. Passing: ${passed.join(", ") || "none"}. Missing: ${failed.join(", ") || "none"}. ` +
          `Be specific, professional, and end with a clear "take" or "skip" recommendation.`;
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (r.ok) {
          const j = await r.json();
          explanation = j?.choices?.[0]?.message?.content ?? "";
        }
      }
    } catch (e) {
      console.error("[evaluateEntry] AI explanation failed", e);
    }

    return {
      score,
      rating,
      zone,
      nearest: near,
      checks,
      explanation,
    };
  });