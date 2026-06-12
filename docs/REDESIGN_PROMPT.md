# Reusable prompt: UI upgrade for a sub-page or linked site

Copy everything below the line into a new Claude Code session, fill in the
[TARGET] placeholder, and adjust the bracketed options if needed.

---

Review the current UI of [TARGET — e.g. `news-events/` in this repo, or the
multi-project-website repo] and upgrade it to a professional, modern, smooth,
fully mobile-friendly UI with efficient, modular code, matching the design
system already established on my portfolio home page (June 2026 redesign).

Before writing any plan, look at the actual rendered UI first (use the Claude
in Chrome browser tools if available — start with the live deployed URL),
then ask me clarifying questions instead of assuming. Write the plan to
`docs/` and get my approval before implementing.

Constraints and established decisions (do not re-litigate these):

1. **Stack**: stay vanilla HTML/CSS/JS, no build step, must run on Netlify
   free tier as-is.
2. **Design system**: reuse the shared tokens in `css/base.css` of
   ppadiya.github.io (spacing/radius/shadow/motion scales, semantic colors).
   Style: clean modern minimal — generous whitespace, strong typography
   (Archivo headings + Space Grotesk body), cards with soft shadows and
   12–16px radius, subtle hover-lift and scroll-reveal.
3. **Theming**: follow the existing architecture — dark palette stays at
   `:root` (never flip it; other dark-only pages depend on it), light mode is
   `[data-theme="light"]` overrides, and the page opts in via the inline head
   script (localStorage 'theme' → prefers-color-scheme) plus the header
   sun/moon toggle. See `docs/UI_UPGRADE_PLAN.md` and the home page
   (`index.html`, `js/theme.js`) for the reference implementation.
4. **Modular CSS**: page stylesheet should be an @import hub over small
   mobile-first modules, all token-driven. No inline styles in HTML.
5. **Responsive, non-negotiable**: mobile-first; verify at 375 / 414 / 768 /
   1024 / 1440 px and landscape; no horizontal scroll from 320px; touch
   targets ≥44px with tap feedback; `100dvh` not `100vh`; safe-area insets
   for fixed elements; body text ≥16px on mobile.
6. **Accessibility**: 4.5:1 text contrast in BOTH themes; visible focus
   states; aria labels on icon-only buttons; scroll-reveal must use
   IntersectionObserver with content visible by default (never opacity-0
   without JS) and respect prefers-reduced-motion.
7. **Don't break existing behavior**: keep all class names/IDs that JS hooks
   into, keep existing Netlify functions and API contracts untouched, keep
   security rules from CLAUDE.md (no innerHTML interpolation, CORS scoped,
   keys in headers).
8. **Workflow**: implement locally, verify in the browser (both themes,
   scrolled states, console errors) on a local server, then STOP and let me
   test before committing. Never push to GitHub until I explicitly approve.
   After my approved push, verify the live Netlify deploy (HTTP 200 on new
   assets, visual check, no console errors) and update README + CHANGELOG.

Ask your clarifying questions now.
