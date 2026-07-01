// Accepts a storage path for a chart screenshot, calls Anthropic Claude
// (vision) to identify trend, BOS/CHoCH, swing high/low, and bias, and
// stores the structured result in structure_analysis.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `You are an expert Smart Money Concepts (SMC) technical analyst.
You will be shown a single price chart screenshot. Analyse the visible price action and return STRICT JSON only, no prose, no markdown fences.

Return exactly this shape:
{
  "trend": "bullish" | "bearish" | "ranging",
  "last_event": { "type": "BOS" | "CHoCH" | "none", "direction": "bullish" | "bearish" | "none", "note": string },
  "swing_high": { "price": number | null, "note": string },
  "swing_low": { "price": number | null, "note": string },
  "bias": "bullish" | "bearish" | "ranging",
  "confidence": "low" | "medium" | "high",
  "reasoning": string
}

Rules:
- Identify the MOST RECENT confirmed break of structure (BOS) or change of character (CHoCH).
- Prices are approximate — read them from chart axes if visible; otherwise set price to null.
- "reasoning" must be one short paragraph (max 3 sentences) explaining the call.
- Never wrap the JSON in code fences. Never add commentary before or after.`;

async function callClaude(imageBase64: string, mediaType: string) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: "Analyse this chart and respond with JSON only." },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  return text.trim().replace(/^```json\s*|\s*```$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = userRes.user.id;

    const { storagePath, timeframe, symbol } = await req.json();
    if (!storagePath || !timeframe) {
      return new Response(JSON.stringify({ error: "Missing storagePath or timeframe" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    // Enforce that the path belongs to this user (userId/... prefix).
    if (!String(storagePath).startsWith(`${userId}/`)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: file, error: dlErr } = await admin.storage
      .from("chart-screenshots")
      .download(storagePath);
    if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message ?? "no file"}`);

    const buf = new Uint8Array(await file.arrayBuffer());
    // base64 encode
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const b64 = btoa(binary);
    const mediaType = file.type || "image/png";

    const jsonText = await callClaude(b64, mediaType);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude returned non-JSON: ${jsonText.slice(0, 200)}`);
    }

    const { data: signed } = await admin.storage
      .from("chart-screenshots")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    const image_url = signed?.signedUrl ?? storagePath;

    const { data: inserted, error: insErr } = await admin
      .from("structure_analysis")
      .insert({
        user_id: userId,
        symbol: symbol ?? null,
        timeframe,
        image_url,
        result_json: parsed,
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify(inserted), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[analyze-structure]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});