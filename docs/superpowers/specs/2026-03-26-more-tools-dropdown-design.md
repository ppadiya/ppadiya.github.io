# Design Spec: "More Tools" Dropdown Navigation

**Date:** 2026-03-26
**Status:** Approved

---

## Summary

Consolidate the Games, AI Tools, and News & Events navigation links under a single "More tools" parent item with a dropdown menu. Add a new "Stock Intel." link to the dropdown pointing to an external tool.

---

## Requirements

- Remove individual top-level nav items: Games, AI Tools, News & Events
- Add a "More tools" nav item with a hover-activated dropdown (desktop)
- Dropdown contains 4 links:
  - Games → `games/index.html`
  - AI Tools → `ai-tools/index.html`
  - News & Events → `news-events/index.html`
  - Stock Intel. → `https://omniboardingsightdeck.netlify.app` (opens in new tab)
- Mobile: dropdown expands/collapses via click inside the hamburger menu
- Consistent with existing site styles (colors, fonts, dark mode)

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Replace 3 nav `<li>` items with dropdown structure |
| `style.css` | Add dropdown positioning, hover/focus-within, animation, and mobile styles |
| `js/nav.js` | Add mobile click-toggle logic for dropdown |

> **Note:** Sub-pages (`games/index.html`, `ai-tools/index.html`, `news-events/index.html`) do not share the `.site-header` / `.main-nav` structure — they have their own self-contained layouts. No changes are needed in those files.

---

## HTML Structure

```html
<li class="nav-dropdown">
  <a href="javascript:void(0)" class="nav-dropdown-toggle" aria-expanded="false">
    More tools <i class="fas fa-chevron-down" aria-hidden="true"></i>
  </a>
  <ul class="dropdown-menu">
    <li><a href="games/index.html">Games</a></li>
    <li><a href="ai-tools/index.html">AI Tools</a></li>
    <li><a href="news-events/index.html">News &amp; Events</a></li>
    <li><a href="https://omniboardingsightdeck.netlify.app" target="_blank" rel="noopener">Stock Intel.</a></li>
  </ul>
</li>
```

The toggle uses `href="javascript:void(0)"` (not `href="#"`) to avoid a conflict with `initSmoothScroll`, which attaches to every `a[href^="#"]` and would attempt `document.querySelector("#")` — an invalid selector that throws a `SyntaxError`. `javascript:void(0)` is inert and never matched by that selector.

`aria-expanded="false"` is toggled to `"true"` by JS when the dropdown is open on mobile, matching the pattern already used by `menuToggle`.

---

## CSS Design

### Desktop

- `.nav-dropdown` — `position: relative` to anchor the dropdown
- `.dropdown-menu` — `position: absolute; top: 100%; left: 0` below the parent; hidden via `opacity: 0; visibility: hidden; pointer-events: none`
- `.nav-dropdown:hover .dropdown-menu, .nav-dropdown:focus-within .dropdown-menu` — `opacity: 1; visibility: visible; pointer-events: auto` with a short fade transition. The `:focus-within` rule ensures keyboard users (Tab to the toggle or any dropdown link) can also open the menu on desktop.
- Dropdown card light mode: `background: var(--surface-color)`, `box-shadow`, `border-radius`
- Dark mode override (placed immediately after the light-mode rule): `body.dark-mode .dropdown-menu { background-color: var(--surface-color-dark); }` — this follows the site's established pattern: all surface cards use `var(--surface-color)` normally and `var(--surface-color-dark)` inside `body.dark-mode`. Both tokens are defined on `:root` simultaneously; `body.dark-mode` acts as a selector-specificity override, not a token swap.
- Dropdown links: same color/hover underline behavior as existing `.main-nav a` links

### Mobile (inside hamburger menu)

Inside the existing mobile `@media` block:

- `.dropdown-menu` — `position: static; max-height: 0; overflow: hidden` (collapsed); transition on `max-height`
- `.nav-dropdown.dropdown-open .dropdown-menu` — `max-height: 200px` (expanded)
- `.nav-dropdown.dropdown-open .nav-dropdown-toggle i` — rotate chevron 180° to indicate open state
- `.main-nav.active` currently has `max-height: 600px`. With the dropdown expanded (4 extra links), this must be increased to `800px` to prevent the sub-list from being clipped.

---

## JS Changes (`js/nav.js` — `initNav`)

Add inside `initNav()`:

1. **Exclude the toggle from the existing close handler** — the current code attaches a click listener to every `a` inside `.main-nav` that closes the hamburger menu. The `.nav-dropdown-toggle` must be excluded (guard: `if (link.classList.contains('nav-dropdown-toggle')) return;`) so that tapping "More tools" on mobile does not immediately close the nav.

2. **Toggle click handler on the toggle anchor** — on `click` of `.nav-dropdown-toggle`: always call `preventDefault()`. If the mobile nav is active (`.main-nav.active`), toggle `.dropdown-open` on the parent `<li>` and set `aria-expanded` to `"true"` or `"false"` accordingly.

3. **Close dropdown when a dropdown link is clicked on mobile** — extend the existing link-click-close logic: clicking any link inside `.dropdown-menu` also removes `.dropdown-open` from the parent `<li>` and resets `aria-expanded` to `"false"`.

4. **Reset dropdown state when hamburger closes** — when the hamburger toggle closes the nav, also remove `.dropdown-open` from all `.nav-dropdown` items and reset their `aria-expanded` to `"false"`.

### `initScrollNav` interaction

`initScrollNav` calls `document.querySelectorAll('.main-nav a')` and toggles `.active` based on whether `link.getAttribute('href') === '#${currentId}'`. The toggle anchor has `href="javascript:void(0)"`, which will never match any section id — so `.active` will reliably remain off for it on every scroll tick. This is correct and requires no change to `initScrollNav`.

---

## Behaviour Matrix

| Scenario | Behaviour |
|----------|-----------|
| Desktop — hover "More tools" | Dropdown fades in |
| Desktop — Tab to toggle or dropdown link | Dropdown opens via `:focus-within` |
| Desktop — mouse/focus leaves dropdown area | Dropdown fades out |
| Desktop — click "More tools" | No navigation (`javascript:void(0)`) |
| Mobile — tap "More tools" | Dropdown expands inline; hamburger stays open |
| Mobile — tap a dropdown link | Nav closes, page navigates |
| Mobile — tap hamburger close | Nav closes; dropdown collapses and resets |

---

## Accessibility

- Toggle anchor has `aria-expanded` toggled by JS (matches `menuToggle` pattern)
- Chevron icon has `aria-hidden="true"` — decorative only
- Desktop keyboard access via `:focus-within` CSS rule — no additional JS needed
- Dropdown links are standard `<a>` elements — keyboard-navigable
