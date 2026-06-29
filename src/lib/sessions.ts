// Forex session UTC hours. Sessions:
// Sydney 22:00-07:00 UTC, Tokyo 00:00-09:00, London 08:00-17:00, NY 13:00-22:00
export type Session = {
  name: string;
  city: string;
  tz: string;
  openUTC: number; // hour
  closeUTC: number;
  color: string; // tailwind text color
  region: { x: number; y: number }; // for world map highlight (percentage)
};

export const SESSIONS: Session[] = [
  { name: "Sydney", city: "Sydney", tz: "Australia/Sydney", openUTC: 22, closeUTC: 7, color: "text-amber-400", region: { x: 88, y: 78 } },
  { name: "Tokyo", city: "Tokyo", tz: "Asia/Tokyo", openUTC: 0, closeUTC: 9, color: "text-rose-400", region: { x: 82, y: 42 } },
  { name: "London", city: "London", tz: "Europe/London", openUTC: 8, closeUTC: 17, color: "text-emerald-400", region: { x: 48, y: 30 } },
  { name: "New York", city: "New York", tz: "America/New_York", openUTC: 13, closeUTC: 22, color: "text-sky-400", region: { x: 25, y: 38 } },
];

export function isSessionActive(s: Session, utcHour: number) {
  if (s.openUTC < s.closeUTC) return utcHour >= s.openUTC && utcHour < s.closeUTC;
  return utcHour >= s.openUTC || utcHour < s.closeUTC;
}

export function nextSessionEvent(s: Session, now: Date): { type: "opens" | "closes"; at: Date } {
  const utcHour = now.getUTCHours();
  const active = isSessionActive(s, utcHour);
  const target = active ? s.closeUTC : s.openUTC;
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(target);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return { type: active ? "closes" : "opens", at: next };
}

export function formatCountdown(ms: number) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}