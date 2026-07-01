import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tools", label: "Trading Tools" },
  { to: "/calculators", label: "Calculators" },
  { to: "/tools/levels", label: "Live Levels" },
  { to: "/tools/structure-analysis", label: "Structure AI" },
  { to: "/tools/entry-check", label: "Entry Check" },
  { to: "/journal", label: "Journal" },
  { to: "/calendar", label: "Calendar" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-strong">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
            <LineChart className="h-5 w-5 text-white" />
          </span>
          <span className="hidden sm:inline">Trade<span className="text-gradient-primary">Edge</span></span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active ? "text-foreground bg-accent/50" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && (user ? (
            <Link to="/dashboard"><Button size="sm" variant="default">Dashboard</Button></Link>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:block"><Button size="sm" variant="ghost">Sign In</Button></Link>
              <Link to="/auth"><Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Get Started</Button></Link>
            </>
          ))}
          <button className="lg:hidden p-2 rounded-md hover:bg-accent/30" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/40 glass-strong">
          <nav className="container mx-auto flex flex-col gap-1 p-4">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30">
                {item.label}
              </Link>
            ))}
            {user && (
              <Link to="/profile" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30">Profile</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}