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
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
    
    // Banner Slider Functionality
    const banner = document.querySelector('.banner');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    
    if (banner && indicators.length > 0) {
        // Auto slide functionality
        setInterval(function() {
            currentSlide = (currentSlide + 1) % indicators.length;
            updateSlider();
        }, 5000);
        
        // Manual slide control with indicators
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function() {
                currentSlide = index;
                updateSlider();
            });
        });
        
        function updateSlider() {
            banner.style.transform = `translateX(-${currentSlide * 100}%)`;
            
            // Update active indicator
            indicators.forEach((indicator, index) => {
                if (index === currentSlide) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            });
        }
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
                const pointsText = item.querySelector('.catalog-points').textContent;
                const points = parseInt(pointsText.replace(/[^0-9]/g, ''));
                
                if (points <= pointsRange.value) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
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
            if (this.closest('.filter-section').querySelector('h3').textContent === 'Categories') {
                const category = this.textContent;
                const catalogItems = document.querySelectorAll('.catalog-item');
                
                catalogItems.forEach(item => {
                    const itemCategory = item.querySelector('.catalog-category').textContent;
                    
                    if (category === 'All' || category === itemCategory) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
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
            if (window.location.href.includes('points-history')) {
                // Search transactions
                const rows = document.querySelectorAll('.transactions-table tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            } else if (window.location.href.includes('redemption-history')) {
                // Search redemption cards
                const cards = document.querySelectorAll('.redemption-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            } else if (window.location.href.includes('redemption-catalog')) {
                // Search catalog items
                const items = document.querySelectorAll('.catalog-item');
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
    
    // Pagination functionality (simplified for mockup)
    const paginationButtons = document.querySelectorAll('.pagination button');
    
    paginationButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            paginationButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // In a real implementation, this would load the corresponding page data
            // For this mockup, we'll just scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
});
