const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os'); // Import os module for tmpdir

// --- START: Transformer Setup ---
// Set Cache Directory for Transformers
const cacheDir = path.join('/tmp', 'transformers_cache');
if (!fs.existsSync(cacheDir)) {
    try {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`Created cache directory: ${cacheDir}`);
    } catch (e) {
        console.error(`Failed to create cache directory ${cacheDir}:`, e);
    }
}

// Configure environment variables before importing transformers
process.env.TRANSFORMERS_CACHE = cacheDir;
process.env.HF_HUB_CACHE = cacheDir;
process.env.TRANSFORMERS_OFFLINE = '1'; // Force offline mode
console.log(`Transformers cache directory set to: ${cacheDir}, Offline mode: ${process.env.TRANSFORMERS_OFFLINE}`);

// Global pipeline instance
let embeddingPipeline = null;

// Lazy-loads the embedding pipeline
async function getEmbeddingPipeline() {
    if (!embeddingPipeline) {
        try {
            console.log("Initializing embedding pipeline...");            // Use require for better compatibility with Netlify Functions
            const { pipeline } = require('@xenova/transformers');
            // Configure the environment for transformers
            process.env.TRANSFORMERS_JS_NO_LOCAL_FILES = 'true';
            process.env.MODEL_DIR = '/tmp/transformers_cache';
            embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL, {
                quantized: true,
                revision: 'main',
                cache_dir: '/tmp/transformers_cache'
            });
            console.log("Embedding pipeline initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize embedding pipeline:", error);
            embeddingPipeline = null; // Reset on failure
            throw error; // Re-throw error to signal failure
        }
    }
    return embeddingPipeline;
}
// --- END: Transformer Setup ---

// --- Configuration ---
// const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt'); // No longer needed
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'; // Ensure model name matches generation script
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

    // Initialize pipeline separately (lazy loaded on first request)
    // We don't await getEmbeddingPipeline() here to avoid slowing down cold starts
    // It will be called and awaited within the handler when needed.
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

        let queryEmbedding;

        // --- START: Transformer Query Embedding ---
        console.log("Attempting Transformer Query Embedding...");
        try {
            const extractor = await getEmbeddingPipeline();
            if (!extractor) {
                throw new Error("Embedding pipeline failed to initialize.");
            }
            const queryEmbeddingResult = await extractor(query, {
                pooling: 'mean',
                normalize: true
            });
            queryEmbedding = queryEmbeddingResult.tolist()[0];
            console.log("Transformer query embedding generated.");
        } catch (pipelineError) {
             console.error("Transformer pipeline failed, falling back to hashing:", pipelineError);
             // Fall through to hashing if pipeline fails
        }
        // --- END: Transformer Query Embedding ---

        /* --- START: Fallback Query Embedding (Hashing) - (Commented out for deployment) ---
        // This block is commented out. The code above attempts transformer embedding first.
        // If the transformer pipeline fails (pipelineError is caught), queryEmbedding will be undefined,
        // and the check below (`if (!queryEmbedding || ...`) will throw an error.
        // You could add logic here to *only* run hashing if pipelineError occurred,
        // but for deployment, we assume the pipeline should work or fail explicitly.

        // if (!queryEmbedding) {
        //     console.log("Using fallback hashing for query embedding...");
        //     const words = query.toLowerCase().split(/\W+/);
        //     const vector = new Array(384).fill(0); // Match MiniLM embedding dimension
        //     words.forEach(word => {
        //         let hash = 0;
        //         for (let i = 0; i < word.length; i++) {
        //             hash = ((hash << 5) - hash) + word.charCodeAt(i);
        //             hash |= 0; // Convert to 32bit integer
        //         }
        //         vector[Math.abs(hash) % 384] += 1;
        //     });
        //     const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
        //     queryEmbedding = vector.map(val => val / (magnitude || 1));
        //     console.log("Fallback query embedding generated.");
        // }
        --- END: Fallback Query Embedding --- */

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