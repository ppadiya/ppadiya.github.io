/**
 * Navigation behaviours — mobile toggle, smooth scroll, active link highlighting.
 * Imported by any page that has a .site-header / .main-nav structure.
 */

export const initNav = () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (!menuToggle || !mainNav) return;

    menuToggle.addEventListener('click', () => {
        const isExpanded = mainNav.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', String(isExpanded));
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });

    mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (!mainNav.classList.contains('active')) return;
            mainNav.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
};

export const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (!this.hash) return;
            const target = document.querySelector(this.hash);
            if (!target) return;
            e.preventDefault();
            const headerOffset = document.querySelector('.site-header')?.offsetHeight || 0;
            const offsetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        });
    });
};

export const initScrollNav = () => {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.main-nav a');
    if (!sections.length || !navLinks.length) return;

    const highlight = () => {
        const headerOffset = document.querySelector('.site-header')?.offsetHeight || 70;
        let currentId = '';

        sections.forEach(section => {
            const top = section.offsetTop - headerOffset - 50;
            if (window.pageYOffset >= top && window.pageYOffset < top + section.offsetHeight) {
                currentId = section.id;
            }
        });

        if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 50) {
            const last = sections[sections.length - 1];
            if (last) currentId = last.id;
        }

        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
        });

        if (!currentId && window.pageYOffset < window.innerHeight / 2) {
            document.querySelector('.main-nav a[href="#hero"]')?.classList.add('active');
        }
    };

    window.addEventListener('scroll', highlight);
    highlight();
};
