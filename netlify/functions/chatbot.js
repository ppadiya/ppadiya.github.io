const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-chat:free';
const SITE_URL = process.env.URL || 'https://pratikpadiyaportfolio.netlify.app';
const KB_PATH = path.join(__dirname, '../../data/knowledge_base.txt');

let cachedKnowledgeBase = null;

function getKnowledgeBase() {
    if (!cachedKnowledgeBase) {
        cachedKnowledgeBase = fs.readFileSync(KB_PATH, 'utf-8');
    }
    return cachedKnowledgeBase;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'OpenRouter API key not configured.' })
        };
    }

    let query;
    try {
        ({ query } = JSON.parse(event.body));
        if (!query?.trim()) throw new Error('Missing query');
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'A query is required.' }) };
    }

    let knowledgeBase;
    try {
        knowledgeBase = getKnowledgeBase();
    } catch {
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not load portfolio data.' }) };
    }

    const systemPrompt = `You are a helpful assistant for Pratik Padiya's portfolio website. Your job is to answer questions about Pratik — his work experience, skills, education, projects, certifications, and achievements.

Use ONLY the information provided below. If a question cannot be answered from this information, say so politely and suggest the visitor connect with Pratik directly on LinkedIn.

Be conversational, concise, and professional. Do not make up or infer details not present in the data.

--- PRATIK'S PROFILE DATA ---
${knowledgeBase}
--- END OF PROFILE DATA ---`;

    try {
        const response = await axios.post(
            OPENROUTER_API_ENDPOINT,
            {
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.4,
                max_tokens: 600
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': SITE_URL,
                    'X-Title': 'Pratik Padiya Portfolio'
                },
                timeout: 25000
            }
        );

        const answer = response.data.choices[0].message.content;
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response: answer })
        };

    } catch (error) {
        console.error('Chatbot error:', error.message);
        const errDetail = error.response?.data?.error;
        const errText = typeof errDetail === 'object'
            ? (errDetail.message || JSON.stringify(errDetail))
            : (errDetail || error.message);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: `Could not get a response: ${errText}` })
        };
    }
};
