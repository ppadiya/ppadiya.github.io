document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.accordion').forEach(btn => {
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () {
            this.classList.toggle('active');
            const open = this.classList.contains('active');
            this.setAttribute('aria-expanded', String(open));
            const panel = this.nextElementSibling;
            panel.style.maxHeight = open ? panel.scrollHeight + 'px' : null;
        });
    });
});
