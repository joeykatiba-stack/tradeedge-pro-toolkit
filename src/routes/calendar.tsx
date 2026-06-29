import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getTodayEvents } from "@/lib/calendar.functions";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Economic Calendar — TradeEdge Toolkit" }, { name: "description", content: "Today's high-impact economic events for major currencies." }] }),
  component: CalendarPage,
});

const IMPACT: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/40",
  medium: "bg-warning/20 text-warning border-warning/40",
  low: "bg-muted text-muted-foreground border-border",
};

function CalendarPage() {
  const fn = useServerFn(getTodayEvents);
  const { data = [] } = useQuery({ queryKey: ["calendar"], queryFn: () => fn() });
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const rows = filter === "all" ? data : data.filter((e) => e.impact === filter);

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3"><Calendar className="h-7 w-7 text-primary-glow" /> Economic Calendar</h1>
          <p className="text-muted-foreground mt-1">Today's key macroeconomic events.</p>
        </div>
        <div className="flex gap-1 glass p-1 rounded-lg">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium capitalize transition", filter === f ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
              <tr><th className="text-left px-4 py-3">Time</th><th className="text-left px-4 py-3">Currency</th><th className="text-left px-4 py-3">Impact</th><th className="text-left px-4 py-3">Event</th><th className="text-right px-4 py-3">Forecast</th><th className="text-right px-4 py-3">Previous</th><th className="text-right px-4 py-3">Actual</th></tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i} className="border-t border-border/40 hover:bg-accent/20">
                  <td className="px-4 py-3 tabular-nums">{e.time}</td>
                  <td className="px-4 py-3 font-semibold">{e.currency}</td>
                  <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-md text-[10px] uppercase border", IMPACT[e.impact])}>{e.impact}</span></td>
                  <td className="px-4 py-3">{e.event}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{e.forecast ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{e.previous ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{e.actual ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Sample events shown. Connect a calendar API for live data.</p>
    </div>
  );
}