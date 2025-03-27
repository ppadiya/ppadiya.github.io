document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            // Toggle icon (optional: change bars to X)
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close menu when a link is clicked
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    const icon = menuToggle.querySelector('i');
                     if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                     }
                }
            });
        });
    }

    // --- Smooth Scrolling for Nav Links ---
    // Handled by CSS `scroll-behavior: smooth;` but this is a JS fallback/enhancement
    // You might need this if CSS smooth scroll isn't sufficient or for more control
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Only prevent default if it's a link *within* the page
            if (this.hash !== "") {
                const targetId = this.hash;
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    e.preventDefault(); // Prevent default only if target exists
                    const headerOffset = document.querySelector('.site-header')?.offsetHeight || 0; // Get header height dynamically
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth" // Ensure smooth behavior
                    });
                }
            }
        });
    });

    // --- Animate Elements on Scroll ---
    const scrollElements = document.querySelectorAll('.animate-on-scroll');

    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        // Adjust the trigger point (e.g., when 1/3 of the element is visible)
        // Higher dividend means it triggers sooner (e.g., 1.2 means when it's 20% *above* the bottom)
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('visible');
    };

    const hideScrollElement = (element) => {
         // Optional: Remove 'visible' if you want animation to repeat on scroll up
         // element.classList.remove('visible');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.15)) { // Trigger slightly before element bottom hits viewport bottom
                displayScrollElement(el);
            } else {
                // Optional: hide again if you want repeat animations
                // hideScrollElement(el);
            }
        });
    };

    // Initial check on page load
    handleScrollAnimation();
    // Add scroll event listener
    window.addEventListener('scroll', handleScrollAnimation);


    // --- Active Navigation Link Highlighting on Scroll ---
    const sections = document.querySelectorAll('main section[id]'); // Get all sections with an ID in main
    const navLinks = document.querySelectorAll('.main-nav a');

    const highlightNav = () => {
        let currentSectionId = '';
        const headerOffset = document.querySelector('.site-header')?.offsetHeight || 70; // Header height

        sections.forEach(section => {
            const sectionTop = section.offsetTop - headerOffset - 50; // Adjust offset as needed
            const sectionHeight = section.offsetHeight;
            // Check if scroll position is within the current section bounds
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        // Special case for bottom of page / contact section
        if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 50) { // If near bottom
            const lastSection = sections[sections.length - 1];
            if (lastSection) {
                 currentSectionId = lastSection.getAttribute('id');
            }
        }


        navLinks.forEach(link => {
            link.classList.remove('active');
            // Check if the link's href matches the current section ID
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });

         // Highlight 'Home' if scrolled near the top before the first section
        if (!currentSectionId && window.pageYOffset < window.innerHeight / 2) {
            const homeLink = document.querySelector('.main-nav a[href="#hero"]');
            if (homeLink) {
                homeLink.classList.add('active');
            }
        }
    };

    window.addEventListener('scroll', highlightNav);
    highlightNav(); // Initial call


    // --- Footer Current Year ---
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // Check for saved theme preference or use device preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');
    
    // If user previously chose a theme, use that
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }
    
    // Listen for toggle changes
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }

});