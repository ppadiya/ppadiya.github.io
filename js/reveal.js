/**
 * Scroll-reveal via IntersectionObserver.
 *
 * Content is visible by default; the `.js-reveal` class (added here, only
 * when JS runs and motion is allowed) opts elements into the hidden initial
 * state, so there is never a blank page with no JS or with reduced motion.
 */

export const initReveal = () => {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
        els.forEach(el => el.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => {
        el.classList.add('js-reveal');
        observer.observe(el);
    });
};
