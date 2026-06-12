# Changelog

Notable changes to the portfolio site. Dates are in YYYY-MM-DD.

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
