/**
 * Shared sub-page bootstrap: theme toggle + scroll reveal.
 * Load with: <script type="module" src="../js/subpage-ui.js"></script>
 * (The inline head snippet must set data-theme before CSS paints — see index.html.)
 */
import { initTheme } from './theme.js';
import { initReveal } from './reveal.js';

initTheme();
initReveal();
