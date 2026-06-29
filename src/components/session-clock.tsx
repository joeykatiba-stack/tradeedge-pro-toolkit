import { useEffect, useState } from "react";
import { Clock, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SESSIONS, isSessionActive, nextSessionEvent, formatCountdown } from "@/lib/sessions";

function formatTime(d: Date, tz?: string) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz, hour12: false });
}

export function SessionClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const utcHour = now.getUTCHours();
  const activeCount = SESSIONS.filter((s) => isSessionActive(s, utcHour)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Clock className="h-3.5 w-3.5" />Local Time</div>
          <div className="mt-2 font-display text-3xl font-bold tabular-nums">{formatTime(now)}</div>
          <div className="text-xs text-muted-foreground mt-1">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        </div>
        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Globe2 className="h-3.5 w-3.5" />UTC</div>
          <div className="mt-2 font-display text-3xl font-bold tabular-nums">{formatTime(now, "UTC")}</div>
          <div className="text-xs text-muted-foreground mt-1">Universal Time</div>
        </div>
        <div className="glass-strong rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Sessions</div>
          <div className="mt-2 font-display text-3xl font-bold">
            <span className={cn(activeCount > 0 ? "text-success" : "text-muted-foreground")}>{activeCount}</span>
            <span className="text-muted-foreground text-xl"> / 4</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {activeCount >= 2 ? "Overlap — high volatility" : activeCount === 1 ? "Single session live" : "All markets quiet"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SESSIONS.map((s) => {
          const active = isSessionActive(s, utcHour);
          const ev = nextSessionEvent(s, now);
          const countdown = formatCountdown(ev.at.getTime() - now.getTime());
          return (
            <div key={s.name} className={cn(
              "glass rounded-2xl p-5 transition-all relative overflow-hidden",
              active && "ring-1 ring-success/50"
            )}>
              {active && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, oklch(0.72 0.17 160 / 18%), transparent 60%)" }} />}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">{s.name}</h3>
                  <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-success pulse-glow" : "bg-muted")} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.city} · {String(s.openUTC).padStart(2, "0")}:00 – {String(s.closeUTC).padStart(2, "0")}:00 UTC</div>
                <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{active ? "Closes in" : "Opens in"}</div>
                <div className="font-display text-2xl font-bold tabular-nums mt-1">{countdown}</div>
                <div className="mt-3 flex justify-between text-xs">
                  <div>
                    <div className="text-muted-foreground">Local</div>
                    <div className="font-medium tabular-nums">{formatTime(now, s.tz)}</div>
                  </div>
                  <div className={cn("self-end px-2 py-0.5 rounded-md text-[10px] font-medium", active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                    {active ? "OPEN" : "CLOSED"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}