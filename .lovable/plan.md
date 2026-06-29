## TradeEdge Toolkit — Build Plan

A premium dark-mode fintech trading toolkit. I'll ship this in three phases so each piece is solid before stacking the next.

### Phase 1 — Foundation, design system, public surface (this turn)

**Design system** (`src/styles.css`)
- Dark default: bg `#0B0F19`, electric blue `#2563EB`, emerald `#10B981`, red `#EF4444`, with glass surfaces (`--surface-glass`, `--border-glass`), gradients, soft shadows.
- All tokens via `oklch`. Fonts: Space Grotesk (display) + Inter (body) via `@fontsource`.
- Glass card utility, animated counters, hover-lift, subtle grid background.

**Navigation shell**
- Sticky top nav (desktop) + slide-in mobile drawer.
- Routes: `/`, `/dashboard`, `/tools`, `/calculators`, `/journal`, `/calendar`, `/analytics`, `/profile`, `/settings`, `/contact`, plus `/auth` and `/reset-password`.

**Home page**
- Hero with headline, gradient orbs, "Get Started" + "Explore Tools".
- 6 glass feature cards.
- Footer (privacy/terms/contact/social).
- Full SEO `head()` per route.

**Forex Session Clock** (`/tools` main feature)
- Live local + UTC clock, 4 sessions (Sydney/Tokyo/London/NY) with correct UTC hours.
- Active session glow (emerald), countdown to next, overlap indicator.
- Stylized SVG world map highlighting active regions.

**Calculators** (`/calculators`)
- All 7: Position Size, Risk/Reward, Pip, Lot Size, Margin, P/L, Compounding (with Recharts line chart).
- Tabbed interface, Zod-validated inputs, animated results.

### Phase 2 — Lovable Cloud, auth, persistence (this turn)

- Enable Cloud.
- Email/password + Google sign-in (`/auth`), password reset, `/reset-password` page.
- DB schema (migration with grants + RLS):
  - `profiles` (auto-created via trigger): username, country, trading_style, experience, avatar_url
  - `trades`: pair, side, entry, exit, sl, tp, pnl, screenshot_url, notes, opened_at
  - `watchlist`: symbol, kind (crypto/fx/stock)
  - `settings`: notifications, language, currency, timezone
  - `user_roles` + `has_role()` for admin
  - Storage bucket `trade-screenshots` (private, owner RLS)
- Protected layout `_authenticated/` (integration-managed).

### Phase 3 — Authenticated app surface (this turn)

- **Dashboard**: session clock widget, market status, mini calendar, quick risk calc, watchlist, recent trades, stats cards (animated counters), today's goals.
- **Trading Journal** (`/journal`): add/edit/delete trades, screenshot upload, notes, filters, table + cards.
- **Analytics** (`/analytics`): monthly P&L bar chart, win/loss donut, avg R:R, best/worst/most-traded pair, biggest win/loss — derived from trades via server fn.
- **Profile** + **Settings** with persistence.
- **Watchlist**: live crypto via CoinGecko (free, no key), FX via exchangerate.host (free, no key) — server fns with 30s cache.

### Phase 4 — Economic Calendar (needs your input)

You chose external API. Options:
- **TradingEconomics** (free guest endpoint, limited data) — I can wire without a key.
- **Finnhub** (free tier, requires key) — better data, you'd add `FINNHUB_API_KEY`.
- **Forex Factory scrape** — fragile, not recommended.

I'll default to TradingEconomics free guest endpoint so the page works immediately, and add a note about upgrading to Finnhub. If you want Finnhub now, say so and I'll prompt for the key.

### Phase 5 — Admin & extras (after core ships)

Admin panel (users, trades, announcements, site stats), trading tips/quote-of-day rotator, bookmarks. I'll stub these as routes in this build and flesh them out in a follow-up so we don't blow scope in one go.

### Technical notes

- TanStack Start + TanStack Query + Router (loader → `ensureQueryData`, component → `useSuspenseQuery`).
- All server reads via `createServerFn` (+ `requireSupabaseAuth` for protected).
- Recharts for charts, Lucide for icons, Motion for transitions.
- Zod for every form.
- Sample seed trades inserted on first login so dashboards aren't empty.

---

**Heads up on size**: this is roughly 40+ files. I'll execute Phases 1–3 in this turn (the core working product), then Phase 4 calendar, then Phase 5 admin/extras in follow-ups. Reply "go" to start, or tell me which phase to prioritize / cut.