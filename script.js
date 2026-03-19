import { setCurrentYear } from './js/utils.js';
import { initNav, initSmoothScroll, initScrollNav } from './js/nav.js';
import { enforceDarkMode } from './js/theme.js';

document.addEventListener('DOMContentLoaded', () => {
    enforceDarkMode();
    initNav();
    initSmoothScroll();
    initScrollNav();
    setCurrentYear();

    // --- Animate Elements on Scroll ---
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend;
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach(el => {
            if (elementInView(el, 1.15)) {
                if (!prefersReducedMotion) {
                    el.classList.add('visible');
                } else {
                    el.style.opacity = 1;
                    el.style.transform = 'translateY(0)';
                    el.classList.add('visible');
                }
            }
        });
    };

    handleScrollAnimation();
    if (!prefersReducedMotion) {
        window.addEventListener('scroll', handleScrollAnimation);
    }

    // --- RSS News Ticker ---
    fetchRSSFeed();
    setInterval(fetchRSSFeed, 300000);
});

async function fetchRSSFeed() {
    try {
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(corsProxy + encodeURIComponent('https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml'));
        const data = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, 'application/xml');
        const items = xml.querySelectorAll('item');

        const tickerList = document.getElementById('tickerList');
        if (!tickerList) return;

        tickerList.innerHTML = '';
        items.forEach(item => {
            const title = item.querySelector('title')?.textContent;
            if (!title) return;
            const li = document.createElement('li');
            li.textContent = title;
            tickerList.appendChild(li);
        });

        // Clone items for smooth infinite scroll
        tickerList.innerHTML += tickerList.innerHTML;
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
    }
}
