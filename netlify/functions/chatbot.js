const fs = require('fs');
const path = require('path');

// Set environment variables for sharp and transformers
process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = "1";
process.env.TRANSFORMERS_CACHE = '/tmp/transformers';

// --- Configuration ---
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt'); // Use path.join
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'; // Model for embeddings
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free'; // Using OpenRouter Deepseek model
const MAX_CONTEXT_TOKENS = 3000; // Approx token limit for context sent to LLM
const TOP_K = 3; // Number of relevant chunks to retrieve
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// --- Site specific details for OpenRouter headers (replace if needed) ---
const SITE_URL = process.env.URL || 'http://localhost:8888'; // Get site URL from Netlify env or default
const SITE_NAME = 'Pratik Padiya Portfolio'; // Replace with your site's actual name/title

// --- Globals (potential for caching in serverless environments) ---
let pipeline = null;
let knowledgeBaseChunks = [];
let knowledgeBaseEmbeddings = null;
// Removed: let groq = null;

// --- Helper Functions ---

// Simple chunking function (split by paragraphs)
function chunkText(text) {
    return text.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
}

// Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) {
        return 0; // Avoid division by zero
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Estimate token count (very basic)
function estimateTokens(text) {
    return text.split(/\s+/).length;
}

// --- Initialization ---
async function initialize() {
    console.log("[Initialize] Starting initialization...");
    // Check for OpenRouter API Key
    if (!process.env.OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY environment variable not set or empty.");
        // No need to initialize a client, but we need the key later
    }
// Check if knowledge base file exists
const kbExists = fs.existsSync(KNOWLEDGE_BASE_PATH);
console.log(`[Initialize] Knowledge base exists: ${kbExists} at path: ${KNOWLEDGE_BASE_PATH}`);

// Check if embedding model directory exists (not a perfect check, but helpful)
// const embeddingModelDir = path.join(__dirname, 'node_modules', '@xenova', 'transformers', EMBEDDING_MODEL);
// const modelDirExists = fs.existsSync(embeddingModelDir);
// console.log(`[Initialize] Embedding model directory exists: ${modelDirExists} at path: ${embeddingModelDir}`);

try {
    const transformersVersion = require('@xenova/transformers/package.json').version;
    console.log(`[Initialize] @xenova/transformers version: ${transformersVersion}`);
} catch (error) {
    console.warn("[Initialize] Could not determine @xenova/transformers version.");
}


    // Load embedding pipeline (only once)
    if (!pipeline) {
        try {
            // Dynamically import the pipeline function
            const { pipeline: p } = await import('@xenova/transformers');
            pipeline = await p('feature-extraction', EMBEDDING_MODEL, { quantized: true }); // Use quantized model for efficiency
            console.log("Embedding pipeline loaded.");
        } catch (error) {
            console.error("Failed to load embedding pipeline:", error);
            pipeline = null; // Ensure pipeline is null if loading fails
            return false; // Indicate initialization failure
        }
    }

    // Load and process knowledge base (only if not already done)
    if (knowledgeBaseChunks.length === 0 || !knowledgeBaseEmbeddings) {
        try {
            console.log("Loading and processing knowledge base...");
            const knowledgeBaseText = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
            knowledgeBaseChunks = chunkText(knowledgeBaseText);

            if (!pipeline) {
                 console.error("Embedding pipeline not available for knowledge base processing.");
                 return false;
            }

            // Generate embeddings in batches if needed (though for this size, one go might be fine)
            const embeddings = await pipeline(knowledgeBaseChunks, { pooling: 'mean', normalize: true });
            knowledgeBaseEmbeddings = embeddings.tolist(); // Convert to standard array
            console.log(`Knowledge base processed into ${knowledgeBaseChunks.length} chunks.`);
        } catch (error) {
            console.error("Failed to load or process knowledge base:", error);
            knowledgeBaseChunks = [];
            knowledgeBaseEmbeddings = null;
            return false; // Indicate initialization failure
        }
    }
    return true; // Indicate successful initialization
}

// --- Netlify Function Handler ---
exports.handler = async (event, context) => {
    // Ensure initialization is complete (pipeline and knowledge base)
    const initialized = await initialize();
    // Check for API key existence here as well, as initialize() doesn't fail if key is missing
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!initialized || !pipeline || !knowledgeBaseEmbeddings || knowledgeBaseChunks.length === 0) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Chatbot embedding/knowledge base initialization failed. Check logs." }),
        };
    }
    if (!openRouterApiKey) {
         return {
            statusCode: 500,
            body: JSON.stringify({ error: "OpenRouter API Key is not configured. Check environment variables." }),
        };
    }


    // Allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let userQuery;
    try {
        const body = JSON.parse(event.body);
        userQuery = body.query;
        if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid 'query' in request body." }) };
        }
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON in request body." }) };
    }

    console.log("Received query:", userQuery);

    try {
        // 1. Embed the user query
        const queryEmbeddingResult = await pipeline(userQuery, { pooling: 'mean', normalize: true });
        const queryEmbedding = queryEmbeddingResult.tolist()[0]; // Get the embedding vector

        // 2. Find relevant chunks (Similarity Search)
        const similarities = knowledgeBaseEmbeddings.map((chunkEmbedding, index) => ({
            index: index,
            score: cosineSimilarity(queryEmbedding, chunkEmbedding)
        }));

        similarities.sort((a, b) => b.score - a.score); // Sort by descending similarity

        // 3. Select top K chunks and build context
        let context = "";
        let currentTokenCount = 0;
        const relevantChunks = [];

        for (let i = 0; i < Math.min(TOP_K, similarities.length); i++) {
            const chunkIndex = similarities[i].index;
            const chunk = knowledgeBaseChunks[chunkIndex];
            const chunkTokens = estimateTokens(chunk);

            if (currentTokenCount + chunkTokens <= MAX_CONTEXT_TOKENS) {
                context += chunk + "\n\n";
                currentTokenCount += chunkTokens;
                relevantChunks.push(chunk); // Keep track if needed for debugging
            } else {
                break; // Stop adding chunks if token limit is exceeded
            }
        }

        if (context.trim().length === 0) {
             console.warn("No relevant context found or context exceeds token limit immediately.");
             // Optionally, proceed without context or return a specific message
        }

        // 4. Construct the prompt for the LLM
        const systemPrompt = `You are a helpful chatbot assistant answering questions about Pratik Padiya based ONLY on the provided context. Be concise and professional. If the answer is not found in the context, say "I don't have information about that based on the provided documents." Do not make up information.`;
        const userPrompt = `Context:\n${context}\n\nQuestion: ${userQuery}\n\nAnswer:`;

        // 5. Call OpenRouter API using fetch
        console.log(`Calling OpenRouter API with model: ${OPENROUTER_MODEL}...`);

        const response = await fetch(OPENROUTER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL, // Recommended header
                'X-Title': SITE_NAME     // Recommended header
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.3, // Lower temperature for more factual answers
                // max_tokens: 150, // Limit response length if needed
            }),
        });

        if (!response.ok) {
            // Attempt to parse error details from OpenRouter response
            let errorDetails = `HTTP status ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetails += `: ${JSON.stringify(errorData)}`;
            } catch (parseError) {
                errorDetails += ` - Failed to parse error response body.`;
            }
            console.error("OpenRouter API Error:", errorDetails);
            throw new Error(`OpenRouter API request failed: ${errorDetails}`);
        }

        const data = await response.json();
        const botResponse = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
        console.log("OpenRouter response received.");

        // 6. Return the response
        return {
            statusCode: 200,
            body: JSON.stringify({ response: botResponse }),
        };

    } catch (error) {
        console.error("Error processing chatbot request:", error);
        // Log the specific error message
        const errorMessage = error.message || "An internal error occurred.";
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An internal error occurred while processing your request. Details: ${errorMessage}` }),
        };
    }
}; // This is the correct closing brace for exports.handler

// Optional: Pre-warm the function by calling initialize() at the module level
// This might help reduce cold start times but consider memory usage implications.
// initialize().catch(err => console.error("Initial pre-warming failed:", err));