# Sub-Page UI Upgrade Plan — Phase 2 (June 2026)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `news-events/`, `ai-tools/`, `games/` (hub + 4 game pages), `loyalty-ui/`, and `PM+framework/` up to the home-page design system: token-driven, modular CSS, both themes via `[data-theme="light"]`, fully responsive, accessible.

**Architecture:** Each page links `../css/base.css` first, then a page-local `style.css` that is an `@import` hub over small mobile-first modules in a local `css/` folder. Theming uses the existing pattern: dark palette at `:root` (never flipped), light overrides via `[data-theme="light"]`, inline head script + header sun/moon toggle. Scroll-reveal copies the home-page pattern (`.animate-on-scroll` + IntersectionObserver, visible by default).

**Tech stack:** Vanilla HTML/CSS/JS, no build step, Netlify static hosting. Fonts: Archivo (headings) + Space Grotesk (body), loaded per page from Google Fonts as on home page.

**Approved decisions (from user):**
- loyalty-ui keeps its own "PremiumRewards" product brand, but modernized (tokens for spacing/radius/shadow/motion may be reused; brand colors stay distinct).
- Games: restyle hub **and** all 4 game pages.
- All five pages get the light/dark toggle.
- ai-tools drops "UNDER CONSTRUCTION" (no badge).

**Hard constraints (do not violate):**
- Keep every JS hook listed in "JS hooks to preserve" below — class names and IDs must survive the redesign.
- No innerHTML interpolation, no inline styles in HTML, CORS/functions untouched, keys in headers.
- Content visible by default; `.js-reveal` only added by JS; respect `prefers-reduced-motion`.
- `100dvh` not `100vh`; safe-area insets on fixed elements; touch targets ≥44px; body text ≥16px mobile; no horizontal scroll from 320px.
- 4.5:1 text contrast in both themes.
- No em dashes in any user-facing copy.
- **No git commits until the user has tested locally and approved.**

---

## Shared infrastructure (Task 0)

**Files:**
- Create: `js/subpage-theme.js` (non-module variant or reuse `js/theme.js` via `<script type="module">`)
- Reference: `css/base.css`, `js/theme.js`, `js/reveal.js`, `index.html` (header/toggle markup)

Every page gets, identically:

1. **Inline head script** (copy verbatim from `index.html`):
   ```html
   <script>
     (function () {
       var t = localStorage.getItem('theme');
       if (t !== 'light' && t !== 'dark') {
         t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
       }
       document.documentElement.dataset.theme = t;
     })();
   </script>
   ```
2. **`<link rel="stylesheet" href="../css/base.css">`** before the page stylesheet.
3. **Theme toggle button**: a fixed sun/moon button styled like `.back-home-btn` (top-right counterpart), `class="theme-toggle"`, `aria-label` set by JS. Wired by importing `initTheme` from `../js/theme.js` in a page module script, or a small shared `../js/subpage-ui.js` that calls `initTheme()` + `initReveal()`.
4. **Scroll reveal**: add `.animate-on-scroll` to cards/sections; import `initReveal` from `../js/reveal.js`; copy the `.animate-on-scroll/.js-reveal/.visible` CSS rules from home page modules into a shared module `css/anim.css` per page (or, better, add them once to `css/base.css` if not already there — check first; if added to base.css, verify home page is unaffected).
5. **Fonts**: `<link>` for Archivo 600/700/800 + Space Grotesk 400/500/600 (same URL as home page `index.html`).
6. Keep existing `.back-home-btn` markup (already shared via base.css).

### Steps
- [ ] Check whether `.animate-on-scroll` CSS lives in a shared file; if page-local on home page, add a single shared block to `css/base.css` (guarded so home page rendering is identical), else reuse.
- [ ] Create `js/subpage-ui.js`: `import { initTheme } from './theme.js'; import { initReveal } from './reveal.js'; initTheme(); initReveal();` (module, loaded with `<script type="module" src="../js/subpage-ui.js">`).
- [ ] Verify home page still renders and toggles correctly after any base.css addition (local server, both themes).

---

## Task 1: news-events/

**Files:**
- Modify: `news-events/index.html`
- Replace: `news-events/style.css` → `@import` hub
- Create: `news-events/css/{layout.css,hero.css,controls.css,cards.css,calendar.css,theme-light.css}` (merge small ones if trivial)
- Do not touch: `news-events/script.js` logic (only verify hooks)

**JS hooks to preserve:** `#news-articles`, `#events-calendar`, `#event-list`, `.toggle-btn` (+ `data-category`), `#search-input`, `#search-button`, `#prev-page`, `#next-page`, `#page-numbers`, `#error-message`, `#no-results-message`, `#json-ld-schema`, `.back-home-btn`, `.loading-skeleton`, `#current-year`.

**Design:**
- Hero: token surface background (not hardcoded navy), Archivo heading, muted intro, the three-bullet list as a compact feature row.
- Category toggle: segmented control using `--surface-color` pills with active state `--primary-color`; kill the orange/blue/green mismatch.
- Search: input + button as one rounded group, token colors, 44px height.
- Article cards: `--surface-color`, `--radius-md`, `--shadow-1`, hover-lift (`translateY(-3px)` + `--shadow-2`), responsive grid `repeat(auto-fill, minmax(300px, 1fr))`, 1 column under 640px.
- Pagination: pill buttons, ≥44px touch.
- Loading skeletons restyled with tokens (keep `.loading-skeleton` class).

### Steps
- [ ] Audit `index.html` for inline styles; move all to CSS.
- [ ] Add head script, base.css link, fonts, theme toggle, module script.
- [ ] Write CSS modules (mobile-first, tokens only; light theme needs few overrides since everything is token-driven; `theme-light.css` only for special cases like hero imagery).
- [ ] Add `.animate-on-scroll` to cards container children appropriately (added by JS render? cards are JS-rendered, so apply reveal to static sections only, or call `initReveal` after render; simplest: static sections only).
- [ ] Verify: both themes, search, category switch, pagination, events calendar render; console clean; widths 320/375/414/768/1024/1440.

## Task 2: ai-tools/

**Files:**
- Modify: `ai-tools/index.html` (title: "Prompt Optimizer", drop UNDER CONSTRUCTION)
- Replace: `ai-tools/style.css` → hub; create `ai-tools/css/{layout.css,editor.css,controls.css}`
- Do not touch: `ai-tools/script.js`, `ai-tools/api/optimize-prompt.js`

**JS hooks to preserve:** `#enhance-btn`, `#original-prompt`, `#optimized-prompt-output`, `.loading-spinner`, `.placeholder`, `.copy-btn`, `#model-select`, `#model-status`.

**Design:**
- Drop sidebar (single tool; sidebar wastes mobile space). Centered single-column header: tool name + one-line description + model select row.
- Two-pane editor: side-by-side ≥1024px, stacked below; textareas with `--surface-color`, `--radius-md`, focus ring; copy buttons ≥44px with tap feedback.
- Enhance button: primary pill between/below panes; spinner inside button while loading (keep `.loading-spinner` element/class).
- Light theme must keep 4.5:1 on textarea placeholder/status text.

### Steps
- [ ] Restructure HTML (preserve all IDs/classes above), remove sidebar, add shared infra.
- [ ] Write CSS modules; verify textarea min-height uses `dvh`-safe sizing on mobile.
- [ ] Verify: model list loads, enhance round-trip works against live function (or netlify dev), copy buttons work, both themes, responsive sweep.

## Task 3: games/ (hub + 4 game pages)

**Files:**
- Modify: `games/index.html`, `games/{memory-game,rock-paper-scissors,snake-game,whack-a-mole}.html`
- Create: `games/css/{shared.css,hub.css,game-shell.css}`; per-game CSS stays embedded only if extraction is disproportionate, otherwise extract to `games/css/<game>.css`
- Each game page has embedded `<style>` + `<script>`; extract styles, keep scripts in place (game logic untouched).

**JS hooks to preserve:** hub: `#dark-mode-toggle`; memory: `#moves`, `.game-board`, `#dark-mode-toggle`; snake: `#gameCanvas`, `.control-btn`, `#score`, `#start-btn`, `#dark-mode-toggle`; RPS: `#playerScore`, `#computerScore`, `#result`, `#dark-mode-toggle`; whack-a-mole: `.mole`, `.hole`, `#start-button`, `#score`, `#time`, `.grid`, `#dark-mode-toggle`.

**Theming note:** these pages have their own legacy `#dark-mode-toggle` checkbox logic. Replace that legacy toggle with the standard `.theme-toggle` + `initTheme()` and **delete the per-page `#dark-mode-toggle` JS blocks** (this is the one sanctioned hook removal; the toggle element and its handler go together so nothing dangles). All page styles become token-driven so the standard theme system covers them.

**Design:**
- Hub: hero (Archivo title, subtitle), game cards in responsive grid, soft shadows, hover-lift, emoji/icon kept, Play button as primary pill ≥44px.
- Game shell (shared): consistent header with back-to-games link, score chips as token surfaces, action buttons ≥44px, canvas/board centered and scaling to viewport (`max-width: min(92vw, 480px)` style sizing), on-screen controls for snake sized for thumbs.
- All colors via tokens so light mode works automatically; per-game accent colors allowed but must pass contrast in both themes.

### Steps
- [ ] Hub: shared infra + restyle; remove legacy toggle JS.
- [ ] One game page at a time: extract `<style>` to `games/css/<game>.css` (linked after shared.css), swap toggle, retest gameplay (play each game briefly), responsive sweep including landscape phone for snake/whack-a-mole.
- [ ] Verify all four games playable, no console errors, both themes.

## Task 4: loyalty-ui/ (keep PremiumRewards brand, modernize)

**Files:**
- Modify: 4 HTML pages
- Refactor: `loyalty-ui/css/styles.css` → `loyalty-ui/css/styles.css` as hub over `loyalty-ui/css/{tokens.css,layout.css,nav.css,hero.css,cards.css,tables.css,theme-light.css}`
- Do not touch behavior in `loyalty-ui/js/main.js` / `placeholders.js` (only the `#dark-mode-toggle` wiring is replaced, same as games).

**JS hooks to preserve:** `.hamburger`, `.nav-links`, `.theme-switch-wrapper`, `.banner`, `.indicator`, `#points-range`, `#range-value`, `.catalog-item`, `.catalog-points`, `.filter-option`, `.catalog-category`, `.transactions-table`, `.search-bar input`, `.redemption-card`, `.pagination button`, `#dark-mode-toggle` (replaced together with its handler, like games).

**Design:**
- Define brand tokens in `loyalty-ui/css/tokens.css` (`--lr-primary` deep blue, `--lr-accent` coral, etc.) that map onto the structural tokens from base.css (spacing/radius/shadow/motion reused). Brand stays; hardcoded hex scattered through 21KB of CSS goes.
- Modern nav: proper sticky header with backdrop blur, mobile hamburger kept, 44px targets.
- Hero banner: real layout (no floating dark card on flat blue), gradient brand surface, modern typography (brand can keep its own font if desired, default to Space Grotesk).
- Cards/tables: radius/shadow/hover from token scale; tables get mobile treatment (stacked or horizontal-scroll wrapper with visible affordance).
- Light/dark: brand-scoped overrides under `[data-theme="light"]` in `theme-light.css`.

### Steps
- [ ] Build tokens.css; migrate styles module by module, page by page (index → catalog → points-history → redemption-history).
- [ ] Swap legacy toggle for standard theme system.
- [ ] Verify all 4 pages: hamburger, banner carousel, range filter, catalog filtering, table search, pagination; both themes; responsive sweep.

## Task 5: PM+framework/

**Files:**
- Modify: `PM+framework/index.html`
- Replace: `PM+framework/style.css` → hub; create `PM+framework/css/{layout.css,accordion.css,cards.css}`
- `PM+framework/script.js` (456 bytes, accordion) untouched; preserve whatever classes it toggles (read it first and list them before editing).

**Design:**
- Page header in Archivo, framework intro as lede.
- Accordion: token surfaces, chevron rotation animation (`--dur-base var(--ease-out)`), 44px row height, full-row hit area, `aria-expanded` on triggers.
- Case study cards: responsive grid, hover-lift, scroll-reveal.

### Steps
- [ ] Read `script.js`, list hooks, then restyle.
- [ ] Shared infra + CSS modules.
- [ ] Verify accordion expand/collapse, both themes, responsive sweep.

---

## Task 6: Final verification (local) — then STOP

- [ ] `netlify dev` (or `python -m http.server`) full pass: every page, both themes, scrolled states.
- [ ] Browser console: zero errors on every page.
- [ ] Responsive: 320/375/414/768/1024/1440 + landscape; no horizontal scroll anywhere.
- [ ] Keyboard: tab through each page; visible focus everywhere; accordion and toggles operable.
- [ ] Reduced motion emulation: content all visible, no reveal animation.
- [ ] **STOP. Hand to user for local testing. No commit, no push.**

## Task 7: After user approval only

- [ ] Commit (logical commits per page), push on explicit approval.
- [ ] Live verify (deploy-verify skill): HTTP 200 on new CSS/JS assets, visual check on Netlify URL, console clean.
- [ ] Update `README.md` + `CHANGELOG.md`.
