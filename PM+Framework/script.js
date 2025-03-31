document.addEventListener('DOMContentLoaded', () => {
    // Dark mode functionality
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Function to apply theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = false;
        }
    };

    // Get the saved theme or check if dark mode was enabled in the previous page
    let savedTheme = localStorage.getItem('theme');
    
    // If no saved theme, use system preference
    if (!savedTheme && prefersDarkScheme.matches) {
        savedTheme = 'dark';
    }
    
    // Apply the initial theme
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    // Listen for toggle changes
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const newTheme = darkModeToggle.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Listen for system theme changes
    prefersDarkScheme.addEventListener('change', (e) => {
        // Only change if no theme is explicitly saved
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

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