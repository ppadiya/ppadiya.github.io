# Changelog

Notable changes to the portfolio site. Dates are in YYYY-MM-DD.

## 2026-06-22 — Phase 2 SEO and UX improvements

### Performance
- `index.html`: Replaced `style.css` @import chain with individual parallel `<link>` tags for `css/layout.css`, `css/header.css`, `css/hero.css`, `css/components.css`, `css/sections.css`. Eliminates serial CSS fetch (LCP improvement).
- `index.html`: Google Fonts and Font Awesome now load asynchronously via `preload` + `onload` pattern with `<noscript>` fallbacks.
- `index.html`: Profile image — added `width="400" height="400"` (eliminates CLS), `fetchpriority="high"` (LCP improvement), removed `loading="lazy"` (image is above the fold).

### Content
- `index.html` hero: Added award callout pill badge — "Contributed to Security Bank's Retail Banker International Asia Trailblazer Award 2025 win".
- `index.html` hero: Added LinkedIn and View Resume CTA buttons alongside existing hero buttons.
- `index.html` About: Rewrote opening paragraph — 143 words, self-identifying, mentions Mastercard APAC, PM-to-SE path, $10M+ revenue, 30% cost reduction metric, and the Trailblazer Award with client attribution.

### UX / Sub-pages
- `css/subpage.css`: Added `.page-footer` styles and sticky-bottom body layout (flex column + `min-height: 100vh`) so footer always sits at the viewport bottom on short pages.
- Added consistent footer (`© Pratik Padiya, Solutions Engineer | Back to Portfolio`) to: `ai-tools/index.html`, `news-events/index.html`, `games/index.html`, `PM+Framework/index.html`.
- `loyalty-ui/index.html`: Updated app footer copyright from "© 2025 PremiumRewards. All rights reserved." to "© 2025 PremiumRewards (demo). Portfolio project by Pratik Padiya." Added a separate portfolio footer below the app footer.

### SEO
- `games/index.html`: Added `<meta name="robots" content="noindex, nofollow">`.
- `css/hero.css`: `.hero-award` pill badge uses `--primary-color` for border and text (correctly resolves in both themes).

---

## 2026-06-22 — Fix sitemap.xml Content-Type (Netlify snippet injection)

### Fixed
- `netlify.toml`: Added explicit `Content-Type: application/xml` header for `sitemap.xml` to prevent Netlify from injecting GA snippet script tags into the XML, which was breaking Google Search Console's sitemap fetch.
- Also added explicit `text/plain` headers for `robots.txt` and `llms.txt` for the same reason.

---

## 2026-06-22 — Phase 1 SEO foundations

### Added
- `robots.txt`: crawl directives with explicit Allow for AI search bots (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot); Disallow for `/games/` and `/loyalty-ui/`; sitemap reference.
- `sitemap.xml`: covers homepage, `/news-events/`, and `/ai-tools/`.
- `llms.txt`: authoritative identity file for LLM/AI search engines (name, role, achievements, project links).
- Google Search Console verification meta tag in `index.html`.
- `<link rel="canonical">` on all pages.
- `<meta name="description">` on all pages (homepage and loyalty-ui were missing; news-events and ai-tools improved).
- Open Graph and Twitter Card tags on `index.html` (previously absent on homepage).
- Person + WebSite + ProfilePage JSON-LD schema on `index.html`.
- BreadcrumbList + WebPage JSON-LD on all sub-pages (news-events, ai-tools, games, loyalty-ui).
- Portfolio demo banner and updated title tag on `loyalty-ui/index.html` to clarify it is a demo, not a live product.
- Security headers in `netlify.toml`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- Cache-Control headers in `netlify.toml` for CSS, JS, and static assets.

### Changed
- Homepage title: "Pratik Padiya - Solutions Engineer | Loyalty, Fintech & Retail, APAC" (was "Solutions Engineer & AI Automation Builder").
- loyalty-ui title: "Credit Card Loyalty Program UI Demo - Pratik Padiya Portfolio" (was "PremiumRewards - Credit Card Loyalty Program").

---

## 2026-06-12 — Security hardening and model fix

### Changed
- `ai-tools/script.js`: default fallback model updated to `openrouter/free` (auto-routes to a free model); removes the stale `meta-llama/llama-3.1-8b-instruct:free` reference that was removed from OpenRouter.

### Security
- Supabase `public.capital_gains`: replaced permissive `FOR ALL USING(true)` anon policy with `deny_anon_capital_gains` (USING(false)); anon role can no longer read or write financial data.
- Revoked `SELECT` from `anon` and `authenticated` on all trading tables (`deposits`, `owned_stocks`, `options`, `expired_options`, `settings`, `rfp_rfi`, `rfp_rfi_listings`, `price_cache`, `capital_gains`, `articles_test`) to remove GraphQL schema exposure. News tables (`articles`, `edb_articles`, `events`) remain public by design.

---

## 2026-06-12 — Sub-page redesign (news-events, ai-tools, games, loyalty-ui, PM+framework)

### Added
- Light/dark theming on every sub-page, using the same architecture as the home page: inline head script before first paint, fixed sun/moon toggle, localStorage override, OS preference fallback. Replaces the legacy per-page checkbox toggles and force-dark code.
- `css/subpage.css`: shared sub-page chrome (fixed theme toggle, scroll-reveal classes, safe-area insets) and `js/subpage-ui.js` (wires `initTheme()` + `initReveal()` from the existing home-page modules).
- Modular, token-driven CSS per page: each page stylesheet is now an import hub over small mobile-first modules (`news-events/css/`, `ai-tools/css/`, `games/css/`, `loyalty-ui/css/`, `PM+framework/css/`).
- `loyalty-ui/css/tokens.css`: PremiumRewards brand palette (dark + light) layered over the shared structural scales, so the demo keeps its own identity.
- Archivo + Space Grotesk typography on all portfolio sub-pages.

### Changed
- news-events: token-driven hero, segmented category control, pill search bar, card grid with hover-lift, restyled skeletons/pagination. `script.js` and all JS hooks untouched.
- ai-tools: dropped the sidebar and the "UNDER CONSTRUCTION" title; centered two-pane editor (side-by-side on desktop, stacked on mobile). Removed the obsolete `enforceDarkMode()` call; all other logic untouched.
- games: hub and all four game pages restyled; embedded styles extracted to `games/css/` with a shared `game-shell.css`. Game logic untouched.
- loyalty-ui: rebuilt CSS as brand-token modules; modern sticky nav with the theme toggle in the navbar; hover-lift cards; mobile-friendly tables. All behavior hooks preserved.
- PM+framework: card-style accordion with `aria-expanded` and animated +/− indicator; case-study cards with hover-lift and scroll-reveal.
- Responsive hardening across all pages: no horizontal scroll from 320px (grid `minmax(min(Npx, 100%), 1fr)` pattern, select/canvas overflow fixes), ≥44px touch targets, `100dvh`, safe-area insets, ≥16px body text.

### Removed
- Per-page legacy theming: duplicated `:root` light/dark variable blocks and `body.dark-mode` toggles in games pages and the hub; force-dark + hidden-toggle code in `loyalty-ui/js/main.js` and `PM+framework/script.js`.
- All inline styles in sub-page HTML.

## 2026-06-12 — Home page redesign

### Added
- Light/dark theming: follows the browser/OS preference by default, with a sun/moon toggle in the header to override (persisted in localStorage). Applied by an inline head script before first paint, so there is no theme flash.
- Modular, mobile-first CSS: `style.css` is now an import hub over `css/layout.css`, `css/header.css`, `css/hero.css`, `css/components.css`, and `css/sections.css`, all driven by design tokens (spacing, radius, shadows, motion) in `css/base.css`.
- `js/reveal.js`: scroll-reveal via IntersectionObserver. Content is visible by default and the effect is skipped under `prefers-reduced-motion` or without JS.
- New typography: Archivo (headings) + Space Grotesk (body).

### Changed
- Full visual refresh of the home page: full-bleed hero with staggered entrance, slimmer single-line header, slide-in mobile nav panel, hover-lift cards for projects/skills/achievements/contact, 44px minimum touch targets, `dvh` units, and safe-area insets for the floating buttons.
- Project cards: gradient tiles are icon-only via CSS classes (duplicate titles and inline styles removed), equal-height grid.
- `js/theme.js`: `initTheme()` manages theming; the legacy `enforceDarkMode()` export remains for the dark-only sub-pages.

### Removed
- Broken "Latest News" RSS ticker (markup, CORS-proxy fetch, and related CSS clearances).
- Unused `responsive-fixes.css` patch layer (folded into the mobile-first modules).

## Earlier (highlights from git history)

- 2026-06 — NewsData.io API key moved from URL parameter to `X-ACCESS-KEY` header; improved enhance-prompt error handling; default OpenRouter model switched to `meta-llama/llama-3.1-8b-instruct:free`.
- 2026-05/06 — Netlify Node runtime bumped to 22, then fetch-news fixed for Node 20 by passing the `ws` transport to the Supabase client.
- Earlier — security remediation pass: CORS scoped to the deployed origin, API keys in headers, `createElement`/`textContent` instead of innerHTML in news-events.
