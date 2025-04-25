document.addEventListener('DOMContentLoaded', () => {
    // Hide theme toggles since we're forcing dark mode
    const mobileToggle = document.querySelector('.mobile-theme-toggle');
    const desktopToggle = document.querySelector('.desktop-theme-toggle');
    if (mobileToggle) mobileToggle.style.display = 'none';
    if (desktopToggle) desktopToggle.style.display = 'none';

    // Force dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');

    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        // Set initial ARIA attributes
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-controls', 'main-navigation'); // Assuming mainNav should have id="main-navigation"
        mainNav.setAttribute('id', 'main-navigation'); // Add ID to the nav element for aria-controls

        menuToggle.addEventListener('click', () => {
            const isExpanded = mainNav.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isExpanded); // Update aria-expanded state

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
                    menuToggle.setAttribute('aria-expanded', 'false'); // Update aria-expanded state
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
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


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
                 if (!prefersReducedMotion) { // Only add class if motion is OK
                    displayScrollElement(el);
                } else { // If motion is reduced, ensure it's visible without animation
                    el.style.opacity = 1;
                    el.style.transform = 'translateY(0)';
                    el.classList.add('visible'); // Add visible class anyway to mark it as processed if needed
                }
            } else {
                // Optional: hide again if you want repeat animations
                // hideScrollElement(el);
            }
        });
    };

    // Initial check on page load
    handleScrollAnimation();
    // Add scroll event listener only if motion is not reduced
    if (!prefersReducedMotion) {
        window.addEventListener('scroll', handleScrollAnimation);
    }


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

    // --- Chatbot Functionality ---
    const chatFab = document.getElementById('chat-fab');
    const chatWindow = document.getElementById('chat-window');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    // Function to add a message to the chat window
    const addMessage = (sender, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        // Basic sanitization (replace potential HTML tags)
        const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Simple markdown support (bold, italics) - can be expanded
        let formattedText = sanitizedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>');       // Italics

        // Handle newlines
        formattedText = formattedText.replace(/\n/g, '<br>');

        messageDiv.innerHTML = `<span>${formattedText}</span>`; // Use innerHTML for formatting
        chatMessages.appendChild(messageDiv);
        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv; // Return the element if needed (e.g., for removal)
    };

    // Function to show/hide thinking indicator
    let thinkingIndicator = null;
    const showThinking = (show = true) => {
        if (show && !thinkingIndicator) {
            thinkingIndicator = addMessage('thinking', '...');
        } else if (!show && thinkingIndicator) {
            thinkingIndicator.remove();
            thinkingIndicator = null;
        }
    };

    // Toggle chat window visibility
    if (chatFab && chatWindow) {
        chatFab.addEventListener('click', () => {
            const isHidden = chatWindow.hidden;
            chatWindow.hidden = !isHidden;
            if (!isHidden) {
                 chatInput.focus(); // Focus input when opening
            }
        });
    }

    // Close chat window
    if (chatCloseBtn && chatWindow) {
        chatCloseBtn.addEventListener('click', () => {
            chatWindow.hidden = true;
        });
    }

    // Handle chat form submission
    if (chatForm && chatInput && chatSendBtn && chatMessages) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userQuery = chatInput.value.trim();

            if (!userQuery) return; // Do nothing if input is empty

            addMessage('user', userQuery);
            chatInput.value = ''; // Clear input
            chatSendBtn.disabled = true; // Disable send button
            showThinking(true); // Show thinking indicator

            try {
                const response = await fetch('/.netlify/functions/chatbot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: userQuery }),
                });

                showThinking(false); // Hide thinking indicator

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
                    console.error('Chatbot API Error:', response.status, errorData);
                    addMessage('bot', `Sorry, something went wrong. ${errorData.error || 'Please try again later.'}`);
                } else {
                    const data = await response.json();
                    addMessage('bot', data.response || "Sorry, I couldn't get a response.");
                }

            } catch (error) {
                showThinking(false); // Hide thinking indicator
                console.error('Error sending message:', error);
                addMessage('bot', 'Sorry, there was an error connecting to the chatbot. Please check your connection and try again.');
            } finally {
                 chatSendBtn.disabled = false; // Re-enable send button
                 chatInput.focus(); // Keep focus on input
            }
        });
    }

    // Fetch the feed when the page loads
    fetchRSSFeed();
    // Refresh the feed every 5 minutes
    setInterval(fetchRSSFeed, 300000);
});

async function fetchRSSFeed() {
    try {
        // Using a CORS proxy to avoid cross-origin issues
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(corsProxy + encodeURIComponent('https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml'));
        const data = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, 'application/xml');
        const items = xml.querySelectorAll('item');
        
        const tickerList = document.getElementById('tickerList');
        tickerList.innerHTML = ''; // Clear existing items
        
        items.forEach(item => {
            const title = item.querySelector('title').textContent;
            const li = document.createElement('li');
            li.textContent = title;
            tickerList.appendChild(li);
        });

        // Clone items for smooth infinite scroll
        const itemsClone = tickerList.innerHTML;
        tickerList.innerHTML += itemsClone;

    } catch (error) {
        console.error('Error fetching RSS feed:', error);
    }
}