# Changelog

Notable changes to the portfolio site. Dates are in YYYY-MM-DD.

---

## 2026-06-25 — Homepage redesign, sub-page polish, housekeeping

### Homepage (`index.html`, `css/hero.css`, `css/sections.css`)
- **Hero:** Restructured from a centered single column to a two-column `.hero-grid` — left column holds the headline, subtitle, tagline, CTAs, and text links; right column is an `.hero-achievement-card` surfacing the RBI award badge and three key metrics ($10M+, 30%, 10+) with the current role line.
- **Trust strip:** New section between hero and experience listing employers (Eagle Eye highlighted as current) plus the RBI Asia Trailblazer 2025 award callout. Label reads "Experience across" (not "Worked with") since Eagle Eye is the current employer.
- **About:** Removed a duplicated paragraph; replaced the three equal highlight cards with an asymmetric layout — one tall featured card ("Pre-sales SE" + "10+ years in APAC retail & payments" stat) beside a stack of two smaller cards (Product Management, Fintech & Payments). Copy updated from "fintech & payments" to "retail & payments".
- **About card fix:** Small highlight cards used `padding: var(--space-5)` while the featured card used `var(--space-6)`, so their icon+heading sat 4px closer to the card's left border. Bumped small cards to `var(--space-6)` so all three align at the same inset. Icon+heading also wrapped in a `.highlight-small-header` flex row.
- **Skills:** Replaced the equal-column grid with a `.skills-bento` layout (featured "SE + PM" block, four regular blocks, one wide block) using `.skill-pill` / `.skill-pill-primary` tags.
- **Cache-busting:** All homepage CSS `<link>` hrefs carry `?v=3` (the `/css/*` files are immutable-cached by `netlify.toml`, so a version bump is required for browsers to pick up CSS changes).

### Sub-pages
- `news-events/css/layout.css`: The `.content-display` panel showed an empty bordered box during loading / no-data (the inner containers are hidden while loading, leaving just the panel chrome). The panel now defaults to no chrome and only restores its border/background/padding when it actually holds content — `:has(.news-item)` or a visible `#events-calendar`. Error and no-results messages already carry their own box styling, so they stay unwrapped. Pure CSS; no script/logic change.
- `PM+Framework/index.html`: Bumped Font Awesome `6.0.0` → `6.4.0` to match the other sub-pages.
- All sub-pages (`PM+Framework`, `news-events`, `ai-tools`, `games`): Added `?v=3` to the shared `../css/base.css` and `../css/subpage.css` links for consistency with the homepage.

### Social / SEO
- `index.html`: Fixed broken `og:image` / `twitter:image` — they pointed to `/images/placeholder-profile.jpg` (a non-existent folder); corrected to the real root file `/placeholder-profile.jpg` (the same photo the hero uses). `twitter:card` stays `summary`, which suits the 400×400 square image.
- `news-events/index.html`: Replaced the `path/to/your/social-share-image.jpg` placeholder `og:image` / `twitter:image` with `/placeholder-profile.jpg`, and switched `twitter:card` from `summary_large_image` to `summary` to match the square image. Social shares now show a valid preview on both pages.
- `index.html`, `news-events/index.html`: Appended `?v=2` to the `og:image` / `twitter:image` URLs to bust LinkedIn's image cache (it keys on the full URL incl. query), forcing a fresh fetch of the current profile photo on re-scrape.

### Housekeeping
- Deleted `mockup-preview.html` (throwaway preview from the redesign review).
- `.gitignore`: Added `.agents/` and `skills-lock.json` (local agent tooling).

---

## 2026-06-23 — Security audit remediation + UI fix

### Security (remediates `security-audits/audit-2026-06-22-2228.md`)
- **Dependencies (P1, High):** `npm audit fix` bumped transitive `form-data` to 4.0.6, clearing the GHSA unsafe-random-boundary advisory. `npm audit --omit dev` now reports 0 vulnerabilities. `package-lock.json` updated.
- **Outbound timeouts (P2, Medium):** `netlify/functions/fetch-news.js` — added `signal: AbortSignal.timeout(8000)` to the NewsData.io and NewsAPI.org `fetch()` calls, and `timeout: 8000` to the `rss-parser` instance. Brings the file in line with the "timeouts on all outbound HTTP" standard.
- **Error leakage (P3, Low):** `netlify/functions/chatbot.js` — the 500 response no longer echoes upstream provider error text to the client; it returns a generic message while full detail is still logged server-side only.

### Fixes
- `ai-tools/index.html`: Fixed the "Your enhanced prompt will appear here..." placeholder rendering offset. Root cause: `.output-display` uses `white-space: pre-wrap`, so the source-code indentation before the `<span>` was rendered as literal leading whitespace. Collapsed the markup so the placeholder span is the immediate, only child of the output div. Runtime output is unaffected (JS replaces the div content).

---

## 2026-06-22 — Phase 3: Content depth, favicon, performance

### Content
- `index.html`: Added Experience section (between hero and About) — Eagle Eye, Sales Engineer (Jul 2025–Present); Mastercard, Director SE Presales + Product Manager (Jun 2015–Oct 2024, 9 yrs). Styled with monogram logo placeholders.
- `index.html`: Added employer strip below hero CTA buttons — "Worked with: Eagle Eye, Mastercard, S2 Infotech, Nisa Group" — as subtle pill badges.
- `index.html` APAC Market Expansion card: Expanded to ~120 words covering the localization problem, eight-market rollout approach, and $10M+ revenue outcome.
- `index.html` API Ecosystem Development card: Expanded to ~120 words covering fragmented integration problem, unified API gateway approach, and 30% cost / 50% time-to-live outcomes. Tech stack updated to Swagger/OpenAPI (OAuth 1.0 removed).
- `index.html` Credit Card Rewards Program card: Expanded to ~120 words covering the UX problem, what the prototype demonstrates, and the Trailblazer Award context.
- `index.html` About: Added "retail" to domain description; corrected Fintech & Payments highlight from "10+ years" to "9+ years".
- `index.html` Skills: Added parenthetical to OpenClaw — "OpenClaw (personal trading intelligence platform)".
- `ai-tools/index.html`: Added collapsible "About this tool" block (collapsed by default) above the tool interface — explains purpose, tech stack, and instructs users to switch models if optimization fails.

### Technical
- `PM+Framework/index.html`: Converted all five accordion phases from `<button>` + JS-driven `max-height` to native `<details>`/`<summary>` elements. Content is now crawlable without JavaScript. `PM+Framework/css/accordion.css` rewritten accordingly.
- `index.html` Key Achievements: Refactored icon containers from `<i class="fas ... achievement-icon">` to `<span class="achievement-icon"><i class="fas ..."></i></span>`. Root cause: Font Awesome's `.fas { display: inline-block }` was overriding `display: flex` at equal CSS specificity. Separating the flex container from the FA element fixes centering on all five items.

### Assets
- `favicon.ico`, `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png`: "P" monogram favicon in brand blue on dark navy. Wired into `<head>` of all six pages.
- `flowdiagram.webp`: WebP conversion of `flowdiagram.png` — 368 KB → 44 KB (88% reduction).
- `netlify.toml`: Added cache headers for `.ico`, `.png`, and `.webp` files (immutable, 1 year).
- `css/sections.css`: Experience timeline styles added.
- `css/hero.css`: Employer strip styles added.

---

## 2026-06-22 — Phase 2: Performance, content, sub-page UX

### Performance
- `index.html`: Replaced `style.css` `@import` chain with individual parallel `<link>` tags. Eliminates serial CSS fetch (LCP improvement).
- `index.html`: Google Fonts and Font Awesome now load asynchronously via `preload` + `onload` pattern with `<noscript>` fallbacks.
- `index.html`: Profile image — added `width="400" height="400"` (eliminates CLS), `fetchpriority="high"` (LCP), removed `loading="lazy"` (above the fold).

### Content
- `index.html` hero: Added award callout pill badge for the RBI Asia Trailblazer Award 2025.
- `index.html` hero: Added LinkedIn and View Resume CTA buttons.
- `index.html` About: Rewrote opening paragraph — 143 words, self-identifying, covers Mastercard APAC, PM-to-SE path, $10M+ revenue, 30% cost reduction, and Trailblazer Award.

### UX / Sub-pages
- `css/subpage.css`: Added `.page-footer` styles and sticky-bottom body layout so footer always sits at viewport bottom on short pages.
- Added consistent footer to: `ai-tools/index.html`, `news-events/index.html`, `games/index.html`, `PM+Framework/index.html`.
- `loyalty-ui/index.html`: Updated app footer to "(demo)" framing; added separate portfolio footer.
- `games/index.html`: Added `<meta name="robots" content="noindex, nofollow">`.

---

## 2026-06-22 — Fix sitemap.xml Content-Type

- `netlify.toml`: Added explicit `Content-Type: application/xml` for `sitemap.xml` to prevent Netlify GA snippet injection from breaking Google Search Console's sitemap fetch. Same fix applied to `robots.txt` and `llms.txt` (`text/plain`).

---

## 2026-06-22 — Phase 1: SEO foundations

### Added
- `robots.txt`: crawl directives; AI bots (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) explicitly allowed; `/games/` and `/loyalty-ui/` disallowed.
- `sitemap.xml`: homepage, `/news-events/`, `/ai-tools/`.
- `llms.txt`: authoritative identity file for LLM/AI search engines.
- Google Search Console verification meta tag in `index.html`.
- `<link rel="canonical">` on all pages.
- `<meta name="description">` on all pages.
- Open Graph and Twitter Card tags on `index.html`.
- Person + WebSite + ProfilePage JSON-LD on `index.html`; BreadcrumbList + WebPage JSON-LD on all sub-pages.
- Portfolio demo banner and corrected title on `loyalty-ui/index.html`.
- Security headers in `netlify.toml`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- Cache-Control headers in `netlify.toml` for CSS, JS, and images.

### Changed
- Homepage title: "Pratik Padiya - Solutions Engineer | Loyalty, Fintech & Retail, APAC".
- loyalty-ui title: "Credit Card Loyalty Program UI Demo - Pratik Padiya Portfolio".

---

## 2026-06-12 — Security hardening and model fix

- `ai-tools/script.js`: default model updated to `openrouter/free` (removes stale `meta-llama/llama-3.1-8b-instruct:free`).
- Supabase `public.capital_gains`: replaced permissive `FOR ALL USING(true)` anon policy with `USING(false)` deny policy.
- Revoked `SELECT` from `anon` and `authenticated` on all trading tables to remove GraphQL schema exposure. News tables (`articles`, `edb_articles`, `events`) remain public by design.

---

## 2026-06-12 — Sub-page redesign

- Light/dark theming on every sub-page (inline head script, sun/moon toggle, localStorage override, OS preference fallback). Replaces legacy checkbox toggles and force-dark code.
- `css/subpage.css` + `js/subpage-ui.js`: shared sub-page chrome (theme toggle, scroll-reveal, safe-area insets).
- Modular, token-driven CSS per sub-page (`news-events/css/`, `ai-tools/css/`, `games/css/`, `loyalty-ui/css/`, `PM+Framework/css/`).
- `loyalty-ui/css/tokens.css`: PremiumRewards brand palette layered over shared tokens.
- Archivo + Space Grotesk typography on all sub-pages.
- Responsive hardening across all pages: no horizontal scroll from 320px, 44px touch targets, `100dvh`, safe-area insets.
- Removed: all per-page legacy theming code, inline styles in sub-page HTML.

---

## 2026-06-12 — Home page redesign

- Light/dark theming with sun/moon toggle (localStorage, inline head script, no flash).
- Modular mobile-first CSS: `style.css` replaced by individual `<link>` tags over `css/` modules driven by design tokens in `css/base.css`.
- `js/reveal.js`: scroll-reveal via IntersectionObserver; visible-by-default, skipped under `prefers-reduced-motion`.
- Typography: Archivo (headings) + Space Grotesk (body).
- Full visual refresh: full-bleed hero, staggered entrance, hover-lift cards, 44px touch targets, `dvh` units, safe-area insets.
- Removed: broken RSS ticker, unused `responsive-fixes.css`.

---

## Earlier (highlights)

- 2026-06 — NewsData.io API key moved from URL param to `X-ACCESS-KEY` header; enhanced `enhance-prompt` error handling.
- 2026-05/06 — Netlify Node runtime bumped to 22; `fetch-news` fixed for Node 20 by passing `ws` transport to Supabase client.
- Earlier — Security remediation: CORS scoped to deployed origin, API keys in headers, `createElement`/`textContent` in news-events (no innerHTML).
