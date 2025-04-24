// Main JavaScript file for PremiumRewards website

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (hamburger) hamburger.classList.remove('active');
            if (navLinks) navLinks.classList.remove('active');
        });
    });

    // Force dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');

    // Hide theme toggle
    const themeToggle = document.querySelector('.theme-switch-wrapper');
    if (themeToggle) {
        themeToggle.style.display = 'none';
    }

    // Banner Slider Functionality
    const banner = document.querySelector('.banner');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;

    if (banner && indicators.length > 0) {
        // Auto slide functionality
        const slideInterval = setInterval(function() {
            currentSlide = (currentSlide + 1) % indicators.length;
            updateSlider();
        }, 5000);

        // Manual slide control with indicators
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function() {
                currentSlide = index;
                updateSlider();
                // Reset interval on manual click
                clearInterval(slideInterval);
                // Restart interval if needed, or leave it stopped
                // slideInterval = setInterval(...);
            });
        });

        function updateSlider() {
            if (banner) banner.style.transform = `translateX(-${currentSlide * 100}%)`;

            // Update active indicator
            indicators.forEach((indicator, index) => {
                if (indicator) {
                    if (index === currentSlide) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                }
            });
        }
        // Initial update
        updateSlider();
    }

    // Points Range Slider (for Redemption Catalog page)
    const pointsRange = document.getElementById('points-range');
    const rangeValue = document.getElementById('range-value');

    if (pointsRange && rangeValue) {
        pointsRange.addEventListener('input', function() {
            rangeValue.textContent = `${pointsRange.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Points`;

            // Filter catalog items based on points range
            const catalogItems = document.querySelectorAll('.catalog-item');
            catalogItems.forEach(item => {
                const pointsText = item.querySelector('.catalog-points')?.textContent || '0';
                const points = parseInt(pointsText.replace(/[^0-9]/g, ''));

                if (points <= parseInt(pointsRange.value)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        // Initial display update based on default range value
        rangeValue.textContent = `${pointsRange.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Points`;
    }

    // Category Filters (for Redemption Catalog page)
    const filterOptions = document.querySelectorAll('.filter-option');

    filterOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Toggle active state within the same filter section
            const filterSection = this.closest('.filter-section');
            if (filterSection) {
                const options = filterSection.querySelectorAll('.filter-option');
                options.forEach(opt => opt.classList.remove('active'));
            }

            this.classList.add('active');

            // If this is a category filter, filter the catalog items
            const categoryHeader = this.closest('.filter-section')?.querySelector('h3')?.textContent;
            if (categoryHeader === 'Categories') {
                const category = this.textContent;
                const catalogItems = document.querySelectorAll('.catalog-item');

                catalogItems.forEach(item => {
                    const itemCategory = item.querySelector('.catalog-category')?.textContent;

                    if (category === 'All' || category === itemCategory) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
            // Add logic for other filter types (Sort By) if needed
        });
    });

    // Responsive Table for Points History
    function adjustTable() {
        const table = document.querySelector('.transactions-table');
        if (table) {
            if (window.innerWidth < 768) {
                table.classList.add('responsive');
            } else {
                table.classList.remove('responsive');
            }
        }
    }

    // Call once on load
    adjustTable();

    // Call on window resize
    window.addEventListener('resize', adjustTable);

    // Search functionality
    const searchInputs = document.querySelectorAll('.search-bar input');

    searchInputs.forEach(input => {
        input.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();

            // Determine which page we're on and search accordingly
            if (window.location.pathname.includes('points-history.html')) {
                // Search transactions
                const rows = document.querySelectorAll('.transactions-table tbody tr');
                rows.forEach(row => {
                    const text = row.textContent?.toLowerCase() || '';
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            } else if (window.location.pathname.includes('redemption-history.html')) {
                // Search redemption cards
                const cards = document.querySelectorAll('.redemption-card');
                cards.forEach(card => {
                    const text = card.textContent?.toLowerCase() || '';
                    card.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            } else if (window.location.pathname.includes('redemption-catalog.html')) {
                // Search catalog items
                const items = document.querySelectorAll('.catalog-item');
                items.forEach(item => {
                    const text = item.textContent?.toLowerCase() || '';
                    item.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            }
        });
    });

    // Pagination functionality (simplified for mockup)
    const paginationButtons = document.querySelectorAll('.pagination button');

    paginationButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons except arrows
            paginationButtons.forEach(btn => {
                if (!btn.querySelector('i')) { // Don't remove active from arrow buttons
                    btn.classList.remove('active');
                }
            });

            // Add active class to clicked button if it's not an arrow
            if (!this.querySelector('i')) {
                this.classList.add('active');
            }

            // In a real implementation, this would load the corresponding page data
            // For this mockup, we'll just scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const themeKey = 'theme'; // Use consistent key

    // Function to enable dark mode
    function enableDarkMode() {
        body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true; // Checked for dark mode
        localStorage.setItem(themeKey, 'dark');
    }

    // Function to enable light mode
    function enableLightMode() {
        body.classList.remove('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = false; // Unchecked for light mode
        localStorage.setItem(themeKey, 'light');
    }

    // Function to load theme preference from localStorage
    function loadThemePreference() {
        const savedTheme = localStorage.getItem(themeKey);
        // Check for saved theme, default to light if none found
        if (savedTheme === 'dark') {
            enableDarkMode();
        } else {
            enableLightMode(); // Default to light
        }
    }

    // Event listener for the toggle switch
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) { // Checked means dark mode
                enableDarkMode();
            } else { // Unchecked means light mode
                enableLightMode();
            }
        });
    }

    // Load the theme preference when the page loads
    loadThemePreference();

}); // End DOMContentLoaded
