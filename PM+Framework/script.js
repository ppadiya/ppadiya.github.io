document.addEventListener('DOMContentLoaded', () => {
    // Force dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');

    // Hide theme toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.parentElement.style.display = 'none';
    }

    // Existing accordion functionality
    const acc = document.getElementsByClassName("accordion");
    
    for (let i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function() {
            this.classList.toggle("active");
            const panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
});