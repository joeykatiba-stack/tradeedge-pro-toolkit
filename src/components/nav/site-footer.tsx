import { Link } from "@tanstack/react-router";
import { LineChart, Twitter, Github, Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 mt-20">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <LineChart className="h-4 w-4 text-white" />
            </span>
            Trade<span className="text-gradient-primary">Edge</span>
          </div>
          <p className="text-sm text-muted-foreground">Your complete toolkit for forex, crypto and stock trading.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/tools" className="hover:text-foreground">Session Clock</Link></li>
            <li><Link to="/calculators" className="hover:text-foreground">Calculators</Link></li>
            <li><Link to="/journal" className="hover:text-foreground">Journal</Link></li>
            <li><Link to="/analytics" className="hover:text-foreground">Analytics</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Connect</h4>
          <div className="flex gap-3 text-muted-foreground">
            <a href="#" aria-label="Twitter" className="hover:text-foreground"><Twitter className="h-5 w-5" /></a>
            <a href="#" aria-label="GitHub" className="hover:text-foreground"><Github className="h-5 w-5" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-foreground"><Linkedin className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TradeEdge Toolkit. Trading involves risk. Not financial advice.
      </div>
    </footer>
  );
}