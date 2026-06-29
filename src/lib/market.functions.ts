import { createServerFn } from "@tanstack/react-start";

// Crypto via CoinGecko (no key needed)
export const getCryptoQuotes = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano&order=market_cap_desc&per_page=6&page=1&sparkline=false&price_change_percentage=24h", { headers: { accept: "application/json" } });
    if (!r.ok) return [];
    const arr = await r.json() as Array<{ symbol: string; name: string; current_price: number; price_change_percentage_24h: number; image: string }>;
    return arr.map((c) => ({ symbol: c.symbol.toUpperCase(), name: c.name, price: c.current_price, change: c.price_change_percentage_24h ?? 0, image: c.image }));
  } catch { return []; }
});

// FX via exchangerate.host (free, no key)
export const getForexQuotes = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const r = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP,JPY,CHF,CAD,AUD,NZD");
    if (!r.ok) return [];
    const j = await r.json() as { rates?: Record<string, number> };
    const rates = j.rates ?? {};
    return [
      { pair: "EUR/USD", price: rates.EUR ? 1 / rates.EUR : 0 },
      { pair: "GBP/USD", price: rates.GBP ? 1 / rates.GBP : 0 },
      { pair: "USD/JPY", price: rates.JPY ?? 0 },
      { pair: "USD/CHF", price: rates.CHF ?? 0 },
      { pair: "USD/CAD", price: rates.CAD ?? 0 },
      { pair: "AUD/USD", price: rates.AUD ? 1 / rates.AUD : 0 },
      { pair: "NZD/USD", price: rates.NZD ? 1 / rates.NZD : 0 },
    ];
  } catch { return []; }
});