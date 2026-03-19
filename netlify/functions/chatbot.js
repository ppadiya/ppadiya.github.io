const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';
const SITE_URL = process.env.URL || 'https://pratikpadiyaportfolio.netlify.app';
const KB_PATH = path.join(__dirname, '../../data/knowledge_base.txt');
const MODEL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Fallback list used only if the OpenRouter models fetch fails
const FALLBACK_MODELS = [
    'deepseek/deepseek-chat:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-2-9b-it:free',
    'mistralai/mistral-7b-instruct:free'
];

let modelCache = { models: null, fetchedAt: 0 };
let cachedKnowledgeBase = null;

async function getFreeModels() {
    if (modelCache.models && (Date.now() - modelCache.fetchedAt) < MODEL_CACHE_TTL) {
        return modelCache.models;
    }
    try {
        const res = await axios.get(OPENROUTER_MODELS_ENDPOINT, { timeout: 8000 });
        const free = res.data.data
            .filter(m => m.id.endsWith(':free'))
            .map(m => m.id);
        if (free.length > 0) {
            modelCache = { models: free, fetchedAt: Date.now() };
            console.log(`Model cache refreshed: ${free.length} free models loaded.`);
            return free;
        }
    } catch (err) {
        console.error('Failed to fetch model list, using fallback:', err.message);
    }
    return FALLBACK_MODELS;
}

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

    const models = await getFreeModels();

    const systemPrompt = `You are a helpful assistant for Pratik Padiya's portfolio website. Your job is to answer questions about Pratik — his work experience, skills, education, projects, certifications, and achievements.

Use ONLY the information provided below. If a question cannot be answered from this information, say so politely and suggest the visitor connect with Pratik directly on LinkedIn.

Be conversational, concise, and professional. Do not make up or infer details not present in the data.

--- PRATIK'S PROFILE DATA ---
${knowledgeBase}
--- END OF PROFILE DATA ---`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
    ];
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': 'Pratik Padiya Portfolio'
    };

    for (const model of models) {
        try {
            const response = await axios.post(
                OPENROUTER_API_ENDPOINT,
                { model, messages, temperature: 0.4, max_tokens: 600 },
                { headers, timeout: 25000 }
            );
            const answer = response.data.choices[0].message.content;
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: answer })
            };
        } catch (error) {
            const errDetail = error.response?.data?.error;
            const errText = typeof errDetail === 'object'
                ? (errDetail.message || JSON.stringify(errDetail))
                : (errDetail || error.message);
            console.error(`Model ${model} failed: ${errText}`);
            if (errText && (errText.includes('No endpoints') || errText.includes('unavailable'))) {
                continue;
            }
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: `Could not get a response: ${errText}` })
            };
        }
    }

    return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'All AI models are currently unavailable. Please try again later.' })
    };
};
