import { createFileRoute } from "@tanstack/react-router";
import { Calculators } from "@/components/calculators";

export const Route = createFileRoute("/calculators")({
  head: () => ({
    meta: [
      { title: "Trading Calculators — TradeEdge Toolkit" },
      { name: "description", content: "Position size, risk/reward, pip value, lot size, margin, profit/loss and compounding calculators for forex traders." },
      { property: "og:title", content: "Trading Calculators" },
      { property: "og:description", content: "Seven essential calculators every trader needs." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Trading Calculators</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Size every trade correctly. Inputs save as you type.</p>
      </header>
      <Calculators />
    </div>
  );
}