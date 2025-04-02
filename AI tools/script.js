document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle'); // New toggle input
    const enhanceBtn = document.getElementById('enhance-btn');
    const originalPromptTextarea = document.getElementById('original-prompt');
    const optimizedPromptOutput = document.getElementById('optimized-prompt-output');
    const loadingSpinner = optimizedPromptOutput.parentElement.querySelector('.loading-spinner');
    const outputPlaceholder = optimizedPromptOutput.querySelector('.placeholder');
    const copyBtns = document.querySelectorAll('.copy-btn');

    // --- Theme Switching (Slider Toggle) ---
    const themeKey = 'theme'; // Use consistent key

    // Function to enable dark mode
    function enableDarkMode() {
        document.body.classList.remove('light-theme');
        // Ensure dark-mode class isn't accidentally added if not used by this page's CSS
        // document.body.classList.add('dark-mode'); // CSS uses :root variables primarily
        darkModeToggle.checked = true; // Slider is checked for dark mode
        localStorage.setItem(themeKey, 'dark');
    }

    // Function to enable light mode
    function enableLightMode() {
        document.body.classList.add('light-theme');
        // document.body.classList.remove('dark-mode'); // CSS uses :root variables primarily
        darkModeToggle.checked = false; // Slider is unchecked for light mode
        localStorage.setItem(themeKey, 'light');
    }

    // Function to load theme preference from localStorage
    function loadThemePreference() {
        const savedTheme = localStorage.getItem(themeKey);
        // Check for saved theme, default to dark if none found
        if (savedTheme === 'light') {
            enableLightMode();
        } else {
            enableDarkMode();
        }
    }

    // Event listener for the toggle switch
    // Event listener for the toggle switch
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) { // Checked means dark mode
            enableDarkMode();
        } else { // Unchecked means light mode
            enableLightMode();
        }
    });

    // Load the theme preference when the page loads
    loadThemePreference();

    // --- Copy Button Functionality ---
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const targetElement = document.getElementById(targetId);
            let textToCopy = '';

            if (targetElement) {
                if (targetElement.nodeName === 'TEXTAREA') {
                    textToCopy = targetElement.value;
                } else if (targetElement.classList.contains('output-display')) {
                    // Handle potential placeholder or actual content
                    const placeholder = targetElement.querySelector('.placeholder');
                    if (placeholder && placeholder.offsetParent !== null) { // Check if placeholder is visible
                        textToCopy = ''; // Don't copy placeholder text
                    } else {
                         // Clone the node to avoid modifying the original's structure during copy
                        const clone = targetElement.cloneNode(true);
                        // Remove placeholder if it exists in the clone
                        const clonedPlaceholder = clone.querySelector('.placeholder');
                        if (clonedPlaceholder) {
                            clonedPlaceholder.remove();
                        }
                        textToCopy = clone.textContent || clone.innerText || '';
                    }
                }

                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy.trim())
                        .then(() => {
                            // Optional: Provide visual feedback (e.g., change button text/icon)
                            const originalIcon = btn.innerHTML;
                            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`; // Checkmark
                            setTimeout(() => { btn.innerHTML = originalIcon; }, 1500);
                        })
                        .catch(err => {
                            console.error('Failed to copy text: ', err);
                            // Optional: Show error message to user
                        });
                }
            } else {
                console.error('Target element not found for copy button:', targetId);
            }
        });
    });

    // --- Enhance Prompt Logic ---
    enhanceBtn.addEventListener('click', async () => {
        const originalPrompt = originalPromptTextarea.value.trim();

        if (!originalPrompt) {
            // Maybe show a small validation message near the textarea
            originalPromptTextarea.focus();
            return;
        }

        // 1. Show Loading State
        enhanceBtn.disabled = true;
        enhanceBtn.textContent = 'Optimizing...';
        if (outputPlaceholder) outputPlaceholder.style.display = 'none'; // Hide placeholder
        optimizedPromptOutput.innerHTML = ''; // Clear previous output
        loadingSpinner.style.display = 'block';


        // 2. Call the Serverless Function
        try {
            console.log("Calling /api/optimize-prompt with prompt:", originalPrompt);

            // --- Actual API Call ---
            const response = await fetch('/api/optimize-prompt', { // Assumes the function is deployed at this relative path
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: originalPrompt
                    // Optionally add model selection here if needed:
                    // model: 'llama3-8b-8192'
                })
            });

            const data = await response.json(); // Always parse JSON, even for errors

            if (!response.ok) {
                // Throw an error with the message from the backend, or a default one
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            const optimizedPrompt = data.optimizedPrompt; // Extract from JSON response
            // --- End API Call ---

            if (!optimizedPrompt) {
                throw new Error("Received empty optimized prompt from the API.");
            }

            // 3. Display Result
            optimizedPromptOutput.textContent = optimizedPrompt; // Display the result from the API

        } catch (error) {
            console.error("Error optimizing prompt:", error);
            optimizedPromptOutput.innerHTML = `<span class="error-message">Error: Could not optimize prompt. ${error.message}</span>`;
            if (outputPlaceholder) outputPlaceholder.style.display = 'block'; // Show placeholder again on error
        } finally {
            // 4. Hide Loading State
            loadingSpinner.style.display = 'none';
            enhanceBtn.disabled = false;
            enhanceBtn.innerHTML = 'Enhance Prompt ✨'; // Use innerHTML if icon was part of the text
        }
    });

    // Optional: Add input event listener to clear placeholder in output if user types in input
    originalPromptTextarea.addEventListener('input', () => {
         if (optimizedPromptOutput.textContent === '' && !loadingSpinner.style.display !== 'none') {
             if (outputPlaceholder) outputPlaceholder.style.display = 'block';
         }
    });

}); // End DOMContentLoaded