const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os'); // Import os module for tmpdir

// --- Configuration ---
// const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt'); // No longer needed
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CONTEXT_TOKENS = 1500;
const TOP_K = 6; // Increase for better recall
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';
const EMBEDDINGS_FILE_PATH = path.join(__dirname, '../../data/embeddings.json'); // Path relative to the function file

// --- Helper Functions ---
// Note: chunkText is no longer needed at runtime if chunks are pre-computed
function chunkText(text) {
    const chunks = text.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    return chunks.reduce((acc, chunk) => {
        if (chunk.length > 500) {
            const sentences = chunk.match(/[^.!?]+[.!?]+/g) || [chunk];
            return [...acc, ...sentences];
        }
        return [...acc, chunk];
    }, []);
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function estimateTokens(text) {
    return text.split(/\s+/).length;
}

function keywordScore(chunk, query) {
    // Simple keyword overlap: count shared words (case-insensitive)
    const chunkText = chunk.text.toLowerCase();
    const queryWords = query.toLowerCase().split(/\W+/);
    let score = 0;
    for (const word of queryWords) {
        if (word.length > 2 && chunkText.includes(word)) score++;
    }
    return score;
}

// loadCache and saveCache are no longer needed as we load directly from the generated file

// Global cache for embeddings, chunks, and the pipeline
let knowledgeBaseChunks = [];
let knowledgeBaseEmbeddings = null;
// Transformer pipeline logic is commented out above for local testing


// Loads pre-computed embeddings and chunks from the JSON file
async function initialize() {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY environment variable not set");
    }

    // Load embeddings only if not already loaded
    if (knowledgeBaseChunks.length === 0 || !knowledgeBaseEmbeddings) {
        try {
            console.log(`Loading pre-computed embeddings from ${EMBEDDINGS_FILE_PATH}...`);
            if (fs.existsSync(EMBEDDINGS_FILE_PATH)) {
                const fileContent = fs.readFileSync(EMBEDDINGS_FILE_PATH, 'utf-8');
                const data = JSON.parse(fileContent);

                if (data.chunks && data.embeddings && Array.isArray(data.chunks) && Array.isArray(data.embeddings) && data.chunks.length === data.embeddings.length) {
                    knowledgeBaseChunks = data.chunks;
                    knowledgeBaseEmbeddings = data.embeddings;
                    console.log(`Successfully loaded ${knowledgeBaseChunks.length} chunks and ${knowledgeBaseEmbeddings.length} embeddings.`);
                } else {
                    throw new Error('Embeddings file is invalid or missing required arrays (chunks, embeddings) or lengths mismatch.');
                }
            } else {
                // This is a critical error - the function cannot work without pre-computed embeddings
                throw new Error(`Embeddings file not found at ${EMBEDDINGS_FILE_PATH}. Please run the generation script first and ensure the file is deployed.`);
            }
        } catch (error) {
            console.error("Initialization error - Failed to load embeddings:", error);
            // Reset global state on failure
            knowledgeBaseChunks = [];
            knowledgeBaseEmbeddings = null;
            // Re-throw to signal a critical failure to the handler
            throw error;
        }
    } else {
         console.log("Embeddings already loaded.");
    }
}

// --- Caching and Logging ---
const CACHE_FILE = path.join(__dirname, 'embeddings_cache.json');
const LOG_FILE = path.join(__dirname, 'chatbot_query_log.json');

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        }
    } catch (e) { /* ignore */ }
    return {};
}
function saveCache(cache) {
    try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch (e) { /* ignore */ }
}
function logQuery(query, contextChunks, response) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        query,
        contextChunks,
        response
    };
    let logs = [];
    try {
        if (fs.existsSync(LOG_FILE)) {
            logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
        }
    } catch (e) { /* ignore */ }
    logs.push(logEntry);
    try { fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2)); } catch (e) { /* ignore */ }
}

const COHERE_API_KEY = process.env.COHERE_API_KEY;
const COHERE_EMBEDDING_ENDPOINT = 'https://api.cohere.ai/v1/embed';

async function getQueryEmbedding(query) {
    const response = await fetch(COHERE_EMBEDDING_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${COHERE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            texts: [query],
            model: 'embed-english-v3.0', // or 'embed-multilingual-v3.0' if you want multilingual support
            input_type: 'search_document'
        })
    });
    if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.embeddings && Array.isArray(data.embeddings[0])) {
        return data.embeddings[0];
    }
    console.error('Cohere API returned:', data);
    throw new Error('Invalid embedding response from Cohere API: ' + JSON.stringify(data));
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        await initialize();

        const { query } = JSON.parse(event.body);
        if (!query?.trim()) {
            throw new Error("Missing or invalid 'query' in request body.");
        }

        // --- Caching ---
        const cache = loadCache();
        if (cache[query]) {
            return { statusCode: 200, body: JSON.stringify({ response: cache[query], cached: true }) };
        }

        console.log("Processing query:", query);

        // Ensure embeddings are loaded
        if (knowledgeBaseChunks.length === 0 || !knowledgeBaseEmbeddings) {
             throw new Error("Knowledge base embeddings not loaded. Initialization might have failed.");
        }

        // Get query embedding from Cohere API
        const queryEmbedding = await getQueryEmbedding(query);

        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
             throw new Error("Failed to generate or retrieve a valid query embedding vector.");
        }

        // Find relevant chunks (embedding similarity)
        const similarities = knowledgeBaseEmbeddings
            .map((embedding, index) => ({ index, score: cosineSimilarity(queryEmbedding, embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, TOP_K);

        // Hybrid rerank: combine with keyword overlap
        const hybridRanked = similarities
            .map(({ index, score }) => {
                const chunk = knowledgeBaseChunks[index];
                const keyword = keywordScore(chunk, query);
                // Weighted sum: prioritize embedding, boost with keyword
                return { index, hybrid: score + 0.1 * keyword, score, keyword };
            })
            .sort((a, b) => b.hybrid - a.hybrid)
            .slice(0, TOP_K);

        // Build context with metadata
        let context = hybridRanked
            .map(({ index, score, keyword }) => {
                const chunk = knowledgeBaseChunks[index];
                return `---\nTitle: ${chunk.metadata?.title || ''}\nTags: ${(chunk.metadata?.tags || []).join(', ')}\nDates: ${(chunk.metadata?.dates || []).join(', ')}\nScore: ${score.toFixed(3)}, Keyword: ${keyword}\nContent: ${chunk.text}`;
            })
            .join("\n\n");

        if (estimateTokens(context) > MAX_CONTEXT_TOKENS) {
            const words = context.split(/\s+/);
            context = words.slice(0, MAX_CONTEXT_TOKENS).join(' ');
        }

        // Improved system prompt
        const systemPrompt = `You are a helpful chatbot assistant answering questions about Pratik Padiya. Use ONLY the provided context chunks below, which include metadata. If the answer is not found in the context, say: 'I don't know based on the provided information.' Do not make up facts or speculate.`;

        console.log("Calling OpenRouter API...");
        const response = await fetch(OPENROUTER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                'X-Title': SITE_NAME
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Context Chunks:\n${context}\n\nQuestion: ${query}\n\nAnswer:`
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`OpenRouter API request failed: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        // --- Save to cache and log ---
        cache[query] = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
        saveCache(cache);
        logQuery(query, context, cache[query]);
        return {
            statusCode: 200,
            body: JSON.stringify({ response: cache[query] })
        };

    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: error.message || "An internal error occurred" })
        };
    }
};