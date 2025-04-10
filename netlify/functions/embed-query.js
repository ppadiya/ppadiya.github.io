const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Set Cache Directory for Transformers ---
// Attempt to configure cache before loading the library
const cacheDir = path.join(os.tmpdir(), 'transformers_cache_embed'); // Use a distinct name if needed
if (!fs.existsSync(cacheDir)) {
    try {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`Created cache directory: ${cacheDir}`);
    } catch (e) {
        console.error(`Failed to create cache directory ${cacheDir}:`, e);
        // Fallback or further error handling might be needed
    }
}
process.env.TRANSFORMERS_CACHE = cacheDir;
process.env.HF_HUB_CACHE = cacheDir;
process.env.TRANSFORMERS_OFFLINE = '1'; // Force offline mode, assuming models are cached
console.log(`Embed Query Fn - Transformers cache set to: ${cacheDir}, Offline: ${process.env.TRANSFORMERS_OFFLINE}`);

// --- Library Import ---
// Try importing dynamically within the function that needs it
// const { pipeline } = require('@xenova/transformers'); // Avoid top-level require if it causes issues

// --- Configuration ---
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// --- Global State ---
let embeddingPipeline = null;

// --- Helper: Initialize Pipeline (Lazy Load) ---
async function getEmbeddingPipeline() {
    if (!embeddingPipeline) {
        try {
            console.log("Embed Query Fn - Initializing embedding pipeline...");
            // Dynamically import the pipeline function ONLY when needed
            const { pipeline } = await import('@xenova/transformers');
            embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL, { quantized: true });
            console.log("Embed Query Fn - Embedding pipeline initialized successfully.");
        } catch (error) {
            console.error("Embed Query Fn - Failed to initialize embedding pipeline:", error);
            embeddingPipeline = null; // Reset on failure
            throw error; // Re-throw error to signal failure
        }
    }
    return embeddingPipeline;
}

// --- Netlify Function Handler ---
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let query;
    try {
        const body = JSON.parse(event.body || '{}');
        query = body.query;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error("Missing or invalid 'query' string in request body.");
        }
    } catch (error) {
        console.error("Embed Query Fn - Error parsing request body:", error);
        return { statusCode: 400, body: JSON.stringify({ error: `Bad Request: ${error.message}` }) };
    }

    try {
        console.log(`Embed Query Fn - Processing query: "${query}"`);
        const extractor = await getEmbeddingPipeline();
        if (!extractor) {
             // This case should ideally be caught by the error thrown in getEmbeddingPipeline
            throw new Error("Embedding pipeline is not available.");
        }

        console.log("Embed Query Fn - Generating embedding...");
        const queryEmbeddingResult = await extractor(query, {
            pooling: 'mean',
            normalize: true
        });

        // Extract the embedding vector
        const queryEmbedding = queryEmbeddingResult.tolist()[0];
        console.log("Embed Query Fn - Embedding generated successfully.");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedding: queryEmbedding })
        };

    } catch (error) {
        console.error("Embed Query Fn - Error processing embedding request:", error);
        // Check if it's the specific initialization error
        const errorMessage = error.message || "An internal error occurred during embedding.";
        const statusCode = error.message?.includes("Failed to initialize embedding pipeline") ? 503 : 500; // Service Unavailable if pipeline fails

        return {
            statusCode: statusCode,
            body: JSON.stringify({ error: errorMessage, details: error.stack }) // Include stack in dev?
        };
    }
};