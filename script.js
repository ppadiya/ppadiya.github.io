import { setCurrentYear } from './js/utils.js';
import { initNav, initSmoothScroll, initScrollNav, initScrollHeader } from './js/nav.js';
import { initTheme } from './js/theme.js';
import { initChatbot } from './js/chatbot.js';
import { initReveal } from './js/reveal.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    initSmoothScroll();
    initScrollNav();
    initScrollHeader();
    setCurrentYear();
    initChatbot();
    initScrollTop();
    initReveal();
});

function initScrollTop() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.pageYOffset > 400);
    }, { passive: true });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
