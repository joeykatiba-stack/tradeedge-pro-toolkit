import { createServerFn } from "@tanstack/react-start";

// Realistic sample economic events (rotating daily). Upgrade to a paid API for live data.
export type EconEvent = {
  time: string; currency: string; impact: "high" | "medium" | "low";
  event: string; forecast?: string; previous?: string; actual?: string;
};

const TEMPLATE: EconEvent[] = [
  { time: "08:30", currency: "USD", impact: "high", event: "Non-Farm Payrolls", forecast: "185K", previous: "187K" },
  { time: "08:30", currency: "USD", impact: "high", event: "Unemployment Rate", forecast: "3.8%", previous: "3.7%" },
  { time: "08:30", currency: "USD", impact: "medium", event: "Average Hourly Earnings m/m", forecast: "0.3%", previous: "0.4%" },
  { time: "10:00", currency: "USD", impact: "high", event: "ISM Manufacturing PMI", forecast: "49.5", previous: "49.0" },
  { time: "12:00", currency: "GBP", impact: "high", event: "BoE Interest Rate Decision", forecast: "5.25%", previous: "5.25%" },
  { time: "13:45", currency: "EUR", impact: "high", event: "ECB Main Refinancing Rate", forecast: "4.50%", previous: "4.50%" },
  { time: "14:30", currency: "EUR", impact: "medium", event: "ECB Press Conference", previous: "—" },
  { time: "23:50", currency: "JPY", impact: "medium", event: "Core Machinery Orders m/m", forecast: "-0.7%", previous: "1.5%" },
  { time: "01:30", currency: "AUD", impact: "medium", event: "RBA Rate Statement", previous: "4.35%" },
  { time: "07:00", currency: "EUR", impact: "low", event: "German Factory Orders m/m", forecast: "-0.5%", previous: "0.3%" },
  { time: "09:00", currency: "EUR", impact: "low", event: "Eurozone Retail Sales m/m", forecast: "0.2%", previous: "-0.3%" },
  { time: "15:00", currency: "CAD", impact: "high", event: "BoC Rate Statement", previous: "5.00%" },
];

export const getTodayEvents = createServerFn({ method: "GET" }).handler(async () => {
  return TEMPLATE;
});