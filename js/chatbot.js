export const initChatbot = () => {
    const toggle = document.getElementById('chatbot-toggle');
    const window_ = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('chatbot-close');
    const form = document.getElementById('chatbot-form');
    const input = document.getElementById('chatbot-input');
    const messages = document.getElementById('chatbot-messages');

    if (!toggle || !window_) return;

    // Open / close
    toggle.addEventListener('click', () => {
        const isOpen = window_.classList.toggle('chatbot-open');
        toggle.setAttribute('aria-expanded', isOpen);
        if (isOpen && messages.children.length === 0) addMessage('bot', "Hi! I'm Pratik's portfolio assistant. Ask me anything about his experience, skills, or projects.");
        if (isOpen) input.focus();
    });

    closeBtn.addEventListener('click', () => {
        window_.classList.remove('chatbot-open');
        toggle.setAttribute('aria-expanded', 'false');
    });

    // Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (!query) return;

        addMessage('user', query);
        input.value = '';
        input.disabled = true;
        form.querySelector('button').disabled = true;

        const typingId = addTyping();

        try {
            const res = await fetch('/.netlify/functions/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            removeTyping(typingId);
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            addMessage('bot', data.response);
        } catch (err) {
            removeTyping(typingId);
            addMessage('bot', `Sorry, something went wrong: ${err.message}`);
        } finally {
            input.disabled = false;
            form.querySelector('button').disabled = false;
            input.focus();
        }
    });

    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = `chatbot-msg chatbot-msg--${role}`;
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function addTyping() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'chatbot-msg chatbot-msg--bot chatbot-msg--typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return id;
    }

    function removeTyping(id) {
        document.getElementById(id)?.remove();
    }
};
