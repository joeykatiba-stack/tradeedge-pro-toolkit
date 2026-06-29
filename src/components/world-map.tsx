import { SESSIONS, isSessionActive } from "@/lib/sessions";
import { useEffect, useState } from "react";

// Lightweight stylized world map (dotted) with session region pulses.
export function WorldMap() {
  const [hour, setHour] = useState(() => new Date().getUTCHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getUTCHours()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden glass-strong">
      <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full opacity-60">
        <defs>
          <pattern id="dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-primary/40" />
          </pattern>
        </defs>
        {/* Simplified continent silhouettes */}
        <g fill="url(#dots)" className="text-primary">
          {/* N. America */}
          <path d="M80,120 Q140,90 220,110 L260,160 Q280,210 240,260 L180,280 Q120,250 90,200 Z" />
          {/* S. America */}
          <path d="M230,290 Q270,280 290,320 L280,400 Q260,440 230,420 L220,360 Z" />
          {/* Europe */}
          <path d="M440,110 Q500,90 540,120 L550,160 Q510,180 470,170 L440,150 Z" />
          {/* Africa */}
          <path d="M460,200 Q520,200 540,260 L530,360 Q500,400 470,380 L450,300 Z" />
          {/* Asia */}
          <path d="M560,100 Q700,90 820,140 L840,200 Q780,240 700,230 L600,210 L570,170 Z" />
          {/* Australia */}
          <path d="M780,340 Q860,330 890,370 L870,410 Q820,420 780,400 Z" />
        </g>
      </svg>
      {SESSIONS.map((s) => {
        const active = isSessionActive(s, hour);
        return (
          <div key={s.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s.region.x}%`, top: `${s.region.y}%` }}>
            <div className="relative">
              <span className={`block h-3 w-3 rounded-full ${active ? "bg-success pulse-glow" : "bg-muted-foreground/40"}`} />
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider ${active ? "text-success" : "text-muted-foreground"}`}>{s.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}