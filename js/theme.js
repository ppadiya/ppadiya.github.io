/**
 * Theme management — system preference by default, manual override via toggle.
 *
 * The initial theme is applied by an inline <head> snippet (see index.html)
 * before CSS paints, to avoid a flash of the wrong theme:
 *
 *   <script>
 *     (function () {
 *       var t = localStorage.getItem('theme');
 *       if (t !== 'light' && t !== 'dark') {
 *         t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
 *       }
 *       document.documentElement.dataset.theme = t;
 *     })();
 *   </script>
 *
 * This module wires up the header toggle button and follows live OS theme
 * changes while the user has no explicit override stored.
 */

const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
};

export const initTheme = () => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    // Re-apply (inline snippet already ran; this syncs the button label)
    apply(document.documentElement.dataset.theme ||
        (media.matches ? 'dark' : 'light'));

    // Follow OS changes only while the user hasn't chosen explicitly
    media.addEventListener('change', (e) => {
        const stored = localStorage.getItem('theme');
        if (stored !== 'light' && stored !== 'dark') {
            apply(e.matches ? 'dark' : 'light');
        }
    });

    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        apply(next);
    });
};

/**
 * Legacy export — sub-pages were designed dark-only and may still import this.
 * It now just ensures the dark palette without touching localStorage, so a
 * user's theme choice on the home page is preserved.
 */
export const enforceDarkMode = () => {
    document.body.classList.add('dark-mode');
    const toggle = document.querySelector('.theme-switch-wrapper');
    if (toggle) toggle.style.display = 'none';
};
