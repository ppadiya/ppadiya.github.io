const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os'); // Import os module for tmpdir
const { VectorizeClient } = require('./vectorizeClient');

// --- Configuration ---
// const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt'); // No longer needed
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CONTEXT_TOKENS = 1500;
const TOP_K = 6; // Number of results to retrieve from Vectorize
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';

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

// Function to get relevant chunks from Vectorize
async function getRelevantChunks(query) {
  try {
    console.log("Searching Vectorize with query:", query);
    const results = await vectorizeClient.search({
      query: query,
      topK: TOP_K
    });
    
    // Debug logging
    console.log("Processed Vectorize results:", JSON.stringify(results, null, 2));
    
    // Process and return results
    if (!results.matches || results.matches.length === 0) {
      console.log("No matches found in Vectorize");
      return [];
    }
    
    return results.matches.map(match => ({
      text: match.text || '', // We now get text directly from the response
      metadata: match.metadata || {},
      score: match.score || 0
    }));
  } catch (error) {
    console.error("Error querying Vectorize:", error);
    throw error;
  }
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Check if Vectorize token is set
        if (!process.env.TOKEN) {
            console.error("Missing Vectorize token in environment variables");
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Server configuration error - Vectorize token missing" }) 
            };
        }

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

        // Get relevant chunks directly from Vectorize
        const relevantChunks = await getRelevantChunks(query);
        
        // Debug logging for chunks
        console.log("Retrieved chunks:", JSON.stringify(relevantChunks, null, 2));
        
        if (!relevantChunks || relevantChunks.length === 0) {
            console.log("No relevant chunks found, returning default response");
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    response: "I don't know based on the provided information.",
                    debug: "No relevant chunks found in Vectorize"
                })
            };
        }

        // Build context with metadata
        let context = relevantChunks
            .map(chunk => 
                `---\nContent: ${chunk.text}\nScore: ${chunk.score.toFixed(3)}\nMetadata: ${JSON.stringify(chunk.metadata)}`
            )
            .join("\n\n");

        // Debug logging for context
        console.log("Built context:", context);

        // Trim context if too large
        if (estimateTokens(context) > MAX_CONTEXT_TOKENS) {
            const words = context.split(/\s+/);
            context = words.slice(0, MAX_CONTEXT_TOKENS).join(' ');
            console.log("Context trimmed to", MAX_CONTEXT_TOKENS, "tokens");
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