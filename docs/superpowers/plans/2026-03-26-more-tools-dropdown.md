# "More Tools" Dropdown Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three top-level nav links (Games, AI Tools, News & Events) with a single "More tools" dropdown that also includes a new "Stock Intel." external link.

**Architecture:** Pure HTML/CSS/JS change across three files. CSS `:hover` + `:focus-within` handles desktop dropdown; `js/nav.js` handles mobile click-toggle. No build step — changes are visible immediately by opening `index.html` in a browser.

**Tech Stack:** Vanilla HTML5, CSS3 custom properties, ES module JS (`js/nav.js`), Font Awesome 6 icons.

---

## File Map

| File | What changes |
|------|-------------|
| `index.html` (lines 44–46) | Replace 3 `<li>` items with a single `.nav-dropdown` `<li>` |
| `style.css` (after line 276) | Add desktop dropdown CSS block |
| `style.css` (inside `@media (max-width: 768px)` block, after line 1278) | Add mobile dropdown overrides + bump `.main-nav.active` max-height |
| `js/nav.js` (`initNav` function, lines 6–33) | Rewrite `initNav` to handle dropdown toggle on mobile |

---

## Task 1: Update HTML — replace nav items with dropdown structure

**Files:**
- Modify: `index.html` lines 44–46

- [ ] **Step 1: Replace the three `<li>` elements**

In `index.html`, find:
```html
                    <li><a href="games/index.html">Games</a></li>
                    <li><a href="ai-tools/index.html">AI Tools</a></li>
                    <li><a href="news-events/index.html">News & Events</a></li>
```

Replace with:
```html
                    <li class="nav-dropdown">
                        <a href="javascript:void(0)" class="nav-dropdown-toggle" aria-expanded="false">More tools <i class="fas fa-chevron-down" aria-hidden="true"></i></a>
                        <ul class="dropdown-menu">
                            <li><a href="games/index.html">Games</a></li>
                            <li><a href="ai-tools/index.html">AI Tools</a></li>
                            <li><a href="news-events/index.html">News &amp; Events</a></li>
                            <li><a href="https://omniboardingsightdeck.netlify.app" target="_blank" rel="noopener">Stock Intel.</a></li>
                        </ul>
                    </li>
```

- [ ] **Step 2: Verify HTML is well-formed**

Open `index.html` in a browser. The nav should show "More tools" where Games/AI Tools/News & Events used to be. Clicking it does nothing (no CSS yet — dropdown is not hidden, so sub-links appear inline). No console errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add More tools dropdown HTML structure to nav"
```

---

## Task 2: Add desktop dropdown CSS

**Files:**
- Modify: `style.css` — insert after line 276 (end of `.main-nav a.active` block)

- [ ] **Step 1: Insert the desktop dropdown CSS block**

In `style.css`, find this exact line (end of the desktop nav section):
```css
.main-nav a:hover,
.main-nav a.active {
    color: var(--primary-color);
}
```

Add the following block immediately after it:

```css
/* Dropdown menu — desktop */
.nav-dropdown {
    position: relative;
}
.dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    min-width: 160px;
    padding: 0.5rem 0;
    list-style: none;
    margin: 0;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    z-index: 200;
}
body.dark-mode .dropdown-menu {
    background-color: var(--surface-color-dark);
    border-color: var(--border-color);
}
.nav-dropdown:hover .dropdown-menu,
.nav-dropdown:focus-within .dropdown-menu {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}
.dropdown-menu li {
    margin: 0;
}
.dropdown-menu a {
    display: block;
    padding: 0.5rem 1rem;
    white-space: nowrap;
}
.dropdown-menu a::after {
    display: none;
}
.nav-dropdown-toggle i {
    font-size: 0.75em;
    margin-left: 0.25rem;
    transition: transform 0.2s ease;
}
```

- [ ] **Step 2: Verify desktop behavior**

Open `index.html` in a browser at desktop width (> 768px). Hovering "More tools" should reveal a card with 4 links. Mouse leaving the card hides it. Tabbing to "More tools" or into the dropdown should keep it visible (`:focus-within`). Dark mode (toggle on site) should show a slightly darker card.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add desktop dropdown CSS for More tools nav"
```

---

## Task 3: Add mobile dropdown CSS overrides

**Files:**
- Modify: `style.css` — inside `@media (max-width: 768px)` block (the one starting at line 1212)

- [ ] **Step 1: Find the insertion point**

Locate this block inside the `@media (max-width: 768px)` section (around line 1274):
```css
    .main-nav a {
        display: block;
        padding: 0.5rem 0;
        width: 100%;
    }
```

Add the following immediately after it:

```css
    /* Dropdown — mobile overrides */
    .dropdown-menu {
        position: static;
        background: transparent;
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0;
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        padding-left: 1rem;
    }
    .nav-dropdown.dropdown-open .dropdown-menu {
        max-height: 200px;
    }
    .nav-dropdown.dropdown-open .nav-dropdown-toggle i {
        transform: rotate(180deg);
    }
```

- [ ] **Step 2: Update `.main-nav.active` max-height**

Find (in the same `@media (max-width: 768px)` block):
```css
      .main-nav.active {
        max-height: 600px;
    }
```

Change `600px` to `800px`:
```css
      .main-nav.active {
        max-height: 800px;
    }
```

- [ ] **Step 3: Verify mobile layout**

Open `index.html` in browser. Shrink to mobile width (< 768px). Open the hamburger menu. "More tools" appears in the list. Tapping it should do nothing yet (JS not wired yet) — the sub-items don't appear. No layout clipping. Verify "More tools" has the chevron icon.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "feat: add mobile dropdown CSS overrides for More tools nav"
```

---

## Task 4: Update nav.js — mobile dropdown toggle behavior

**Files:**
- Modify: `js/nav.js` — rewrite the `initNav` export (lines 6–33)

- [ ] **Step 1: Replace `initNav` with the updated version**

Replace the entire `initNav` function (from `export const initNav = () => {` through its closing `};`) with:

```javascript
export const initNav = () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (!menuToggle || !mainNav) return;

    const closeAllDropdowns = () => {
        mainNav.querySelectorAll('.nav-dropdown.dropdown-open').forEach(li => {
            li.classList.remove('dropdown-open');
            li.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        });
    };

    menuToggle.addEventListener('click', () => {
        const isExpanded = mainNav.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', String(isExpanded));
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
        if (!isExpanded) closeAllDropdowns();
    });

    // Mobile: tap "More tools" to expand/collapse sub-list
    mainNav.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', e => {
            e.preventDefault();
            if (!mainNav.classList.contains('active')) return;
            const parentLi = toggle.closest('.nav-dropdown');
            const isOpen = parentLi.classList.toggle('dropdown-open');
            toggle.setAttribute('aria-expanded', String(isOpen));
        });
    });

    // Clicking any non-toggle nav link closes the hamburger menu
    mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (!mainNav.classList.contains('active')) return;
            if (link.classList.contains('nav-dropdown-toggle')) return;
            mainNav.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
            closeAllDropdowns();
        });
    });
};
```

- [ ] **Step 2: Verify mobile dropdown behavior**

At mobile width (< 768px):
1. Open hamburger menu → "More tools" visible with chevron
2. Tap "More tools" → sub-list expands (Games, AI Tools, News & Events, Stock Intel.), chevron rotates 180°
3. Tap "More tools" again → sub-list collapses
4. Expand sub-list, then tap a dropdown link → nav closes, browser navigates
5. Expand sub-list, then tap the hamburger close → nav and dropdown both close

- [ ] **Step 3: Verify desktop behavior is unchanged**

At desktop width (> 768px):
1. Hover "More tools" → dropdown card appears
2. Mouse leaves → dropdown hides
3. Tab to "More tools" → dropdown stays open (`:focus-within`)
4. Click "More tools" → no navigation, no scroll-to-top
5. All other nav links still work

- [ ] **Step 4: Commit**

```bash
git add js/nav.js
git commit -m "feat: wire mobile dropdown toggle for More tools nav"
```

---

## Task 5: Final cross-browser verification

- [ ] **Step 1: Check dark mode**

Toggle dark mode on the site. Hover "More tools" — the dropdown card should use `var(--surface-color-dark)` (#162032), slightly darker than the surface color. Links should be readable.

- [ ] **Step 2: Check "Stock Intel." link behavior**

Click "Stock Intel." on desktop and mobile. It should open `https://omniboardingsightdeck.netlify.app` in a new tab (`target="_blank"`).

- [ ] **Step 3: Check scroll active-link highlighting**

Scroll through the page. The "More tools" toggle should never get the `.active` blue underline class (it uses `href="javascript:void(0)"` which never matches a section id). Other links (Home, About, etc.) should still highlight correctly.

- [ ] **Step 4: Check the hamburger icon resets properly**

On mobile: open hamburger → open dropdown → close hamburger via button. Hamburger icon should return to bars (not X), dropdown should be collapsed.
