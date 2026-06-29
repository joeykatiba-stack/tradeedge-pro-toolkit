import { createFileRoute } from "@tanstack/react-router";
import { SessionClock } from "@/components/session-clock";
import { WorldMap } from "@/components/world-map";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Forex Session Clock — TradeEdge Toolkit" },
      { name: "description", content: "Live forex session clock for Sydney, Tokyo, London and New York. See active sessions, overlaps and countdowns in real time." },
      { property: "og:title", content: "Forex Session Clock" },
      { property: "og:description", content: "Track Sydney, Tokyo, London and New York sessions live." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Forex Session Clock</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Live sessions across the four major financial centres. Green pulse = market open. Overlaps mean higher liquidity and volatility.</p>
      </header>
      <div className="space-y-8">
        <SessionClock />
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">World Markets</h2>
          <WorldMap />
        </div>
      </div>
    </div>
  );
}