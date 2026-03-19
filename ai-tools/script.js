import { enforceDarkMode } from '../js/theme.js';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_MODEL = 'deepseek/deepseek-chat:free';

document.addEventListener('DOMContentLoaded', () => {
    enforceDarkMode();

    const enhanceBtn = document.getElementById('enhance-btn');
    const originalPromptTextarea = document.getElementById('original-prompt');
    const optimizedPromptOutput = document.getElementById('optimized-prompt-output');
    const loadingSpinner = optimizedPromptOutput.parentElement.querySelector('.loading-spinner');
    const outputPlaceholder = optimizedPromptOutput.querySelector('.placeholder');
    const copyBtns = document.querySelectorAll('.copy-btn');
    const modelSelect = document.getElementById('model-select');
    const modelStatus = document.getElementById('model-status');

    // --- Model Selector ---
    const loadFreeModels = async () => {
        try {
            const res = await fetch(OPENROUTER_MODELS_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { data } = await res.json();

            const freeModels = data
                .filter(m => m.id.endsWith(':free'))
                .sort((a, b) => a.name.localeCompare(b.name));

            modelSelect.innerHTML = '';

            if (!freeModels.length) {
                modelSelect.innerHTML = '<option value="">No free models found</option>';
                modelStatus.textContent = 'Could not load models.';
                return;
            }

            freeModels.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name;
                if (m.id === DEFAULT_MODEL) opt.selected = true;
                modelSelect.appendChild(opt);
            });

            // If the default wasn't in the list, select the first one
            if (!modelSelect.value) modelSelect.selectedIndex = 0;

            modelSelect.disabled = false;
            modelStatus.textContent = `${freeModels.length} free models available`;
        } catch {
            modelSelect.innerHTML = `<option value="${DEFAULT_MODEL}">DeepSeek V3 (default)</option>`;
            modelSelect.disabled = false;
            modelStatus.textContent = 'Could not load model list — using default.';
        }
    };

    loadFreeModels();

    // --- Copy Button ---
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;

            let textToCopy = '';
            if (target.nodeName === 'TEXTAREA') {
                textToCopy = target.value;
            } else if (target.classList.contains('output-display')) {
                const placeholder = target.querySelector('.placeholder');
                if (!placeholder || placeholder.offsetParent === null) {
                    const clone = target.cloneNode(true);
                    clone.querySelector('.placeholder')?.remove();
                    textToCopy = clone.textContent || '';
                }
            }

            if (!textToCopy) return;

            navigator.clipboard.writeText(textToCopy.trim())
                .then(() => {
                    const original = btn.innerHTML;
                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`;
                    setTimeout(() => { btn.innerHTML = original; }, 1500);
                })
                .catch(err => console.error('Failed to copy:', err));
        });
    });

    // --- Enhance Prompt ---
    enhanceBtn.addEventListener('click', async () => {
        const originalPrompt = originalPromptTextarea.value.trim();
        if (!originalPrompt) { originalPromptTextarea.focus(); return; }

        const selectedModel = modelSelect.value || DEFAULT_MODEL;

        enhanceBtn.disabled = true;
        enhanceBtn.textContent = 'Optimizing...';
        if (outputPlaceholder) outputPlaceholder.style.display = 'none';
        optimizedPromptOutput.innerHTML = '';
        loadingSpinner.style.display = 'block';

        try {
            const response = await fetch('/.netlify/functions/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: originalPrompt, model: selectedModel })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

            const optimizedPrompt = data.optimizedPrompt;
            if (!optimizedPrompt) throw new Error('Received empty optimized prompt from the API.');
            optimizedPromptOutput.textContent = optimizedPrompt;

        } catch (error) {
            optimizedPromptOutput.innerHTML = `<span class="error-message">Error: ${error.message}</span>`;
            if (outputPlaceholder) outputPlaceholder.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
            enhanceBtn.disabled = false;
            enhanceBtn.innerHTML = 'Enhance Prompt ✨';
        }
    });
});
