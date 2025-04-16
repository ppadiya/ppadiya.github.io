const fs = require('fs');
const path = require('path');
const { VectorizeClient } = require('./vectorizeClient');

// --- Configuration ---
const MAX_CONTEXT_TOKENS = 1000;
const TOP_K = 4;
const REQUEST_TIMEOUT = 25000;

// Initialize Vectorize client
const vectorizeClient = new VectorizeClient();

// --- Helper Functions ---
function estimateTokens(text) {
    return text.split(/\s+/).length;
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
    try {
        const logEntry = {
            timestamp: new Date().toISOString(),
            query,
            numChunks: Array.isArray(contextChunks) ? contextChunks.length : 0,
            response
        };
        fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
    } catch (e) { /* ignore */ }
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        if (!process.env.TOKEN) {
            console.error("Missing Vectorize token in environment variable");
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Server configuration error - Vectorize token missing" }) 
            };
        }

        const { query } = JSON.parse(event.body);
        if (!query?.trim()) {
            throw new Error("Missing or invalid query");
        }

        // Quick cache check
        const cache = loadCache();
        if (cache[query]) {
            return { statusCode: 200, body: JSON.stringify({ response: cache[query], cached: true }) };
        }

        // Get response from Vectorize with timeout
        const result = await Promise.race([
            vectorizeClient.generateResponse({
                query,
                options: {
                    topK: TOP_K
                }
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
            )
        ]);

        // Update cache and log
        cache[query] = result.answer;
        saveCache(cache);
        logQuery(query, result.documents, result.answer);

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                response: result.answer,
                context: result.documents // Optional: include for debugging
            })
        };

    } catch (error) {
        console.error("Error:", error);
        const errorMessage = error.message?.includes('timeout') 
            ? "I apologize, but the request took too long to process. Please try again."
            : "An error occurred while processing your request. Please try again.";
        
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};