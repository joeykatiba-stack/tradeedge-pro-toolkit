// Accepts a storage path for a chart screenshot, calls a Hugging Face
// vision-language model (via the Inference Providers OpenAI-compatible
// router) to identify trend, BOS/CHoCH, swing high/low, and bias, and
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

const DEFAULT_HF_VISION_MODEL = "google/gemma-3-4b-it";
const HF_VISION_MODEL_FALLBACKS = [
  DEFAULT_HF_VISION_MODEL,
  "google/gemma-3n-E4B-it",
  "meta-llama/Llama-4-Scout-17B-16E-Instruct",
];

async function callHuggingFace(imageBase64: string, mediaType: string) {
  const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("Missing HUGGINGFACE_API_KEY secret");
  const preferredModel = Deno.env.get("HF_VISION_MODEL") ?? DEFAULT_HF_VISION_MODEL;
  const models = Array.from(new Set([preferredModel, ...HF_VISION_MODEL_FALLBACKS]));
  const dataUrl = `data:${mediaType};base64,${imageBase64}`;

  let lastError = "";
  for (const model of models) {
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse this chart and respond with JSON only." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      lastError = `HuggingFace ${res.status} (${model}): ${t}`;
      console.warn(`[analyze-structure] ${lastError}`);
      continue;
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      lastError = `HuggingFace returned an empty response (${model})`;
      console.warn(`[analyze-structure] ${lastError}`);
      continue;
    }

    return text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
  }

  throw new Error(lastError || "HuggingFace vision analysis failed");
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

    const jsonText = await callHuggingFace(b64, mediaType);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Best-effort: extract first JSON object from the response.
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`Model returned non-JSON: ${jsonText.slice(0, 200)}`);
      parsed = JSON.parse(match[0]);
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