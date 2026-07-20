// Universal asset registry for the Entry Evaluator.
// `td` is the Twelve Data ticker used by the fetch-levels function.
export type AssetClass =
  | "Forex"
  | "Metals"
  | "Indices"
  | "Commodities"
  | "Crypto"
  | "Futures"
  | "Stocks";

export type Asset = {
  symbol: string; // canonical UI symbol (used as price_levels.symbol)
  label: string;
  td: string; // Twelve Data ticker
  assetClass: AssetClass;
  pipDecimals?: number;
};

export const ASSETS: Asset[] = [
  // Forex majors
  { symbol: "EUR/USD", label: "EUR/USD", td: "EUR/USD", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "GBP/USD", label: "GBP/USD", td: "GBP/USD", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "USD/JPY", label: "USD/JPY", td: "USD/JPY", assetClass: "Forex", pipDecimals: 3 },
  { symbol: "AUD/USD", label: "AUD/USD", td: "AUD/USD", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "NZD/USD", label: "NZD/USD", td: "NZD/USD", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "USD/CAD", label: "USD/CAD", td: "USD/CAD", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "USD/CHF", label: "USD/CHF", td: "USD/CHF", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "EUR/GBP", label: "EUR/GBP", td: "EUR/GBP", assetClass: "Forex", pipDecimals: 5 },
  { symbol: "EUR/JPY", label: "EUR/JPY", td: "EUR/JPY", assetClass: "Forex", pipDecimals: 3 },
  { symbol: "GBP/JPY", label: "GBP/JPY", td: "GBP/JPY", assetClass: "Forex", pipDecimals: 3 },

  // Metals
  { symbol: "XAU/USD", label: "Gold (XAU/USD)", td: "XAU/USD", assetClass: "Metals", pipDecimals: 2 },
  { symbol: "XAG/USD", label: "Silver (XAG/USD)", td: "XAG/USD", assetClass: "Metals", pipDecimals: 3 },

  // Indices (CFD label → Twelve Data ticker)
  { symbol: "US30", label: "US30 (Dow Jones)", td: "DJI", assetClass: "Indices", pipDecimals: 2 },
  { symbol: "NAS100", label: "NAS100 (Nasdaq 100)", td: "NDX", assetClass: "Indices", pipDecimals: 2 },
  { symbol: "SPX500", label: "SPX500 (S&P 500)", td: "SPX", assetClass: "Indices", pipDecimals: 2 },
  { symbol: "DAX40", label: "DAX40 (Germany 40)", td: "DAX", assetClass: "Indices", pipDecimals: 2 },
  { symbol: "FTSE100", label: "FTSE100 (UK 100)", td: "UKX", assetClass: "Indices", pipDecimals: 2 },
  { symbol: "Nikkei225", label: "Nikkei 225", td: "N225", assetClass: "Indices", pipDecimals: 2 },

  // Commodities
  { symbol: "WTI", label: "WTI Crude Oil", td: "WTI/USD", assetClass: "Commodities", pipDecimals: 2 },
  { symbol: "BRENT", label: "Brent Crude Oil", td: "BRENT/USD", assetClass: "Commodities", pipDecimals: 2 },
  { symbol: "NATGAS", label: "Natural Gas", td: "NG/USD", assetClass: "Commodities", pipDecimals: 3 },

  // Crypto
  { symbol: "BTC/USD", label: "Bitcoin", td: "BTC/USD", assetClass: "Crypto", pipDecimals: 2 },
  { symbol: "ETH/USD", label: "Ethereum", td: "ETH/USD", assetClass: "Crypto", pipDecimals: 2 },
  { symbol: "SOL/USD", label: "Solana", td: "SOL/USD", assetClass: "Crypto", pipDecimals: 2 },
  { symbol: "XRP/USD", label: "XRP", td: "XRP/USD", assetClass: "Crypto", pipDecimals: 4 },
  { symbol: "BNB/USD", label: "BNB", td: "BNB/USD", assetClass: "Crypto", pipDecimals: 2 },
  { symbol: "ADA/USD", label: "Cardano", td: "ADA/USD", assetClass: "Crypto", pipDecimals: 4 },

  // Futures (mapped to underlying reference for level data)
  { symbol: "ES", label: "ES · E-mini S&P 500", td: "SPX", assetClass: "Futures", pipDecimals: 2 },
  { symbol: "NQ", label: "NQ · E-mini Nasdaq 100", td: "NDX", assetClass: "Futures", pipDecimals: 2 },
  { symbol: "YM", label: "YM · E-mini Dow", td: "DJI", assetClass: "Futures", pipDecimals: 2 },
  { symbol: "CL", label: "CL · Crude Oil", td: "WTI/USD", assetClass: "Futures", pipDecimals: 2 },
  { symbol: "GC", label: "GC · Gold", td: "XAU/USD", assetClass: "Futures", pipDecimals: 2 },
  { symbol: "SI", label: "SI · Silver", td: "XAG/USD", assetClass: "Futures", pipDecimals: 3 },
];

export const ASSET_BY_SYMBOL: Record<string, Asset> = Object.fromEntries(
  ASSETS.map((a) => [a.symbol, a]),
);

export function stockAsset(ticker: string): Asset {
  const t = ticker.trim().toUpperCase();
  return { symbol: t, label: t, td: t, assetClass: "Stocks", pipDecimals: 2 };
}