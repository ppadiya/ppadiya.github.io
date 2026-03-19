/**
 * Dark mode enforcement — single source of truth across all pages.
 * Hides any theme toggle that may exist in a sub-page's markup.
 */

export const enforceDarkMode = () => {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    const toggle = document.querySelector('.theme-switch-wrapper');
    if (toggle) toggle.style.display = 'none';
};
