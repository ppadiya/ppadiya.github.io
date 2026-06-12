# UI Upgrade Plan — ppadiya.github.io (Home Page + Shared Design System)

**Decisions (confirmed 2026-06-12):** Home page first · stay vanilla (no build step) · clean modern minimal style · system-preference theming with manual toggle override.

## Current State Audit

| Area | Finding |
|------|---------|
| Theming | Dark-only. `js/theme.js` `enforceDarkMode()` forces dark; no `prefers-color-scheme` support. Toggle CSS exists but is dead. |
| CSS | `css/base.css` has tokens (dark values only, not semantic). `style.css` is a 1710-line monolith. `responsive-fixes.css` is a patch layer, sign of non-mobile-first CSS. |
| JS | Already ES modules (`nav.js`, `theme.js`, `chatbot.js`, `utils.js`). Scroll animations use scroll events + `getBoundingClientRect` (jank risk) instead of IntersectionObserver. |
| Typography | Poppins only, single family for headings and body. |
| Icons | Font Awesome CDN (~70KB CSS + font). Heavy for the handful of icons used. |
| Images | JPEG/PNG, no WebP/AVIF, no width/height attributes (CLS risk). Hero uses a background JPEG. |
| Accessibility | Good bones: skip link, focus-visible, aria labels, reduced-motion respected. Keep all of it. |
| Hosting | Static + Netlify functions. No build step today; plan keeps it that way (zero free-tier risk). |

## Live-site visual review findings (2026-06-12, desktop via Claude in Chrome)

1. **Scroll-reveal blackout**: sections render fully invisible (opacity 0) until the scroll handler fires — mid-scroll the viewport is literally a blank dark screen. Replace with IntersectionObserver, reveal-once, and a no-JS/`prefers-reduced-motion` fallback that keeps content visible by default (CSS hides only when JS adds a class).
2. **"Latest News" ticker is broken**: a clipped blue "Latest News:" stub sits stuck in the bottom-left corner overlapping content. Fix or remove; if kept, make it a proper dismissible bar with safe-area padding.
3. **Header wraps awkwardly**: at medium widths the logo wraps to two lines and "More tools ⌄" wraps; nav has too many top-level items. Tighten logo sizing, collapse to hamburger earlier (<1024px).
4. **Hero is a "card in a void"**: large empty dark margins around a translucent hero panel; scroll indicator overlaps the news ticker. Redesign as full-bleed hero with proper vertical rhythm.
5. **Project cards inconsistent**: gradient placeholder tiles with duplicated titles (title on tile AND below it), uneven card heights, washed-out low-contrast body text (~3:1). Use one title, real thumbnails or consistent minimal tiles, equal-height grid, contrast-checked text.
6. **Low contrast throughout**: section headings render gray-on-dark during reveal; skill chips and "Tech:" lines are dim. Token pass must enforce 4.5:1.
7. **Floating button stack**: scroll-top + chatbot FABs stack in the bottom-right and collide with the ticker; define a single FAB column with spacing tokens.

## Design System (Phase 1 — foundation for all later pages)

### Semantic tokens (`css/base.css` rewrite)
Two token layers: raw palette → semantic roles. Themes switch via `data-theme` on `<html>`.

- **Light:** background `#F8FAFC`, surface `#FFFFFF`, text `#1E293B`, headings `#0F172A`, primary `#2563EB`, CTA accent `#F97316`, border `#E2E8F0`.
- **Dark:** background `#0F172A`, surface `#1E293B`, text `#CBD5E1`, headings `#F1F5F9`, primary `#4C9AFF` (desaturated, not inverted), accent `#FF8F73`, border `#334155`. (Current dark palette is good, keep it.)
- Spacing scale (4/8px rhythm): `--space-1..12`. Radius scale: `8/12/16px`. Shadow scale: 3 elevation tiers per theme. Motion tokens: `--ease-out`, `--dur-fast: 150ms`, `--dur-base: 250ms`.
- Both themes verified at 4.5:1 body-text contrast.

### Theming behavior (`js/theme.js` rewrite)
1. Inline `<head>` snippet (3 lines, before CSS) reads `localStorage.theme` → else `prefers-color-scheme`, sets `data-theme` (prevents flash of wrong theme).
2. Header toggle button (sun/moon SVG) writes override to localStorage; "system" remains default until user touches the toggle.
3. Listen to `matchMedia('(prefers-color-scheme: dark)')` changes when no override is set.
4. Delete `enforceDarkMode()`. Add `color-scheme: light dark` so native form controls/scrollbars follow.

### Typography
- Headings: **Archivo** (600/700), Body: **Space Grotesk** (400/500), via Google Fonts with `display=swap`, preconnect kept, only needed weights.
- Type scale: 14 / 16 / 18 / 24 / 32 / 44–56 (hero, clamp()-fluid). Body 16px min, line-height 1.6, headings 1.2.

### Icons
- Replace Font Awesome with inline **Lucide SVGs** (copy the ~12 icons used: menu, chevron, linkedin, github, mail, etc. as an SVG sprite). Removes the CDN dependency and ~70KB.

## Phase 2 — Modular CSS restructure

Split `style.css` into `css/` modules, loaded via one `main.css` with `@import` (no build step; HTTP/2 makes this fine at this scale):

```
css/
  base.css        (tokens, reset, themes)
  layout.css      (container, sections, grid utilities)
  header.css      (nav, dropdown, mobile menu, theme toggle)
  hero.css
  components.css  (buttons, cards, badges, tags)
  sections.css    (about, portfolio, skills, achievements, contact, footer)
  chatbot.css     (existing, retokenized)
```

- Mobile-first throughout; fold `responsive-fixes.css` into the modules and delete it.
- Breakpoints: 375 / 768 / 1024 / 1440. `min-h-dvh` for hero. No horizontal scroll at 375px.

## Phase 3 — Home page visual redesign (clean modern minimal)

1. **Header:** slimmer (64px), translucent surface with backdrop-blur on scroll, active-section indicator on nav links, theme toggle, refined mobile menu (slide-in panel, focus-trapped, body scroll lock).
2. **Hero:** remove background photo; clean surface with a subtle radial accent glow + fluid clamp() headline, role line, two CTAs (primary filled `#2563EB`/CTA orange on hover-test, secondary outline). Staggered entrance (80ms steps, transform/opacity only).
3. **About:** two-column → stacks at 768px; profile image with soft ring; highlight cards get hover lift (translateY(-4px) + shadow tier 2, 200ms ease-out).
4. **Projects:** card grid (1/2/3 columns at breakpoints), each card: image (WebP, width/height set, lazy), tag chips, title, one-liner, arrow link with micro-slide on hover. `:focus-within` parity with hover.
5. **Skills:** replace any bars/lists with grouped chip clusters (Pre-sales / Product / Technical), tabular layout, no percentage theatrics.
6. **Achievements:** timeline or stat cards with count-up on first reveal (IntersectionObserver, skipped under reduced-motion).
7. **Contact + footer:** simplified single CTA block, social icons (Lucide), form (if kept) with visible labels, blur validation, error text below field.
8. **Scroll animations:** replace scroll-event handler with one `IntersectionObserver` util (`js/reveal.js`), `once: true`, transform/opacity only, disabled under `prefers-reduced-motion`.
9. **Scroll-to-top + chatbot FAB:** keep, retokenize, ensure 44px targets and safe-area padding.

## Phase 4 — Performance & polish

- Convert hero/profile/project images to WebP (keep JPEG fallback via `<picture>` if needed); add explicit `width`/`height` everywhere (CLS < 0.1).
- `loading="lazy"` below the fold; preload the two font files actually used.
- `touch-action: manipulation` on buttons/links; all targets ≥44px.
- Lighthouse pass target: ≥95 performance / 100 accessibility on mobile.

## Phase 5 — Sub-page compatibility (within scope)

Sub-pages (news-events, games, ai-tools, loyalty-ui, PM+Framework) still load `css/base.css`. The token rename must not break them:
- Keep all existing custom-property **names**, only re-map values per theme, so sub-pages inherit theming for free where they use tokens.
- Smoke-test every sub-page in both themes; pin any page that hardcodes dark styling with `data-theme` fallback rules. Full redesign of those pages is a later effort.

## Responsive requirements (non-negotiable, applies to every phase)

- **Mobile-first CSS**: base styles target small screens; `min-width` media queries scale up. Never the reverse.
- **Device matrix to verify on every change**: 375px (small phone), 414px (large phone), 768px portrait + 1024px landscape (tablet), 1280–1440px (laptop/desktop), plus landscape phone orientation.
- Fluid layout between breakpoints: `clamp()` typography, percentage/`minmax()` grids — no fixed pixel widths on containers.
- No horizontal scroll at any width ≥320px; images and embeds constrained with `max-width: 100%`.
- Touch: all interactive targets ≥44×44px with ≥8px spacing; `touch-action: manipulation`; hover effects always have tap/focus equivalents.
- `min-height: 100dvh` (not `100vh`) for full-height sections; safe-area insets for fixed FABs/header on notched phones.
- Body text ≥16px on mobile (prevents iOS auto-zoom); line length capped ~65–75ch on wide screens.
- Nav: hamburger panel below 1024px, full nav above; dropdown usable by touch, not hover-only.

## Verification (before any push — per deployment rules)

1. `netlify dev` locally: test 375px, 768px, 1024px, 1440px; light + dark + system-change live; reduced-motion emulation; keyboard-only nav; chatbot + enhance-prompt still work.
2. Lighthouse mobile run (perf, a11y, CLS).
3. User reviews locally and explicitly approves before any GitHub push (Netlify deploys on push).

## Out of scope (explicitly)

- Redesign of games / AI tools / loyalty UI / PM Framework pages (future phases).
- Any build tooling, framework, or Netlify function changes.
- Rate limiting (consciously deferred per SECURITY_REMEDIATION_REPORT §11).
