import { enforceDarkMode } from '../js/theme.js';

document.addEventListener('DOMContentLoaded', () => {
    enforceDarkMode();

    document.querySelectorAll('.accordion').forEach(btn => {
        btn.addEventListener('click', function () {
            this.classList.toggle('active');
            const panel = this.nextElementSibling;
            panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + 'px';
        });
    });
});
