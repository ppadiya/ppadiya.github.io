const fs = require('fs');
const path = require('path');

// Configure transformers to use RAM-based caching
process.env.TRANSFORMERS_CACHE = '/tmp';
process.env.TORCH_HOME = '/tmp';

// --- Configuration ---
// KNOWLEDGE_BASE_PATH is no longer needed here as embeddings are pre-computed
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'; // Still needed for query embedding
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CONTEXT_TOKENS = 1500;
const TOP_K = 2;
// BATCH_SIZE is no longer needed for generation within the function
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';
const PRECOMPUTED_EMBEDDINGS_PATH = path.join(__dirname, './embeddings_cache.json'); // Path to the pre-computed file

// --- Helper Functions ---
function chunkText(text) {
    const chunks = text.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    // Further chunk long paragraphs
    return chunks.reduce((acc, chunk) => {
        if (chunk.length > 500) { // If chunk is too long, split it
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

// --- Initialization with optimized loading ---
let pipelinePromise = null;
let knowledgeBaseChunks = [];
let knowledgeBaseEmbeddings = null;

async function getPipeline() {
    if (!pipelinePromise) {
        try {
            const { pipeline } = await import('@xenova/transformers');
            pipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL, {
                quantized: true,
                cache_dir: '/tmp',
                local_files_only: false
            });
        } catch (error) {
            console.error('Pipeline initialization error:', error);
            throw error;
        }
    }
    return pipelinePromise;
}

// processChunkBatch, loadCache, and saveCache are no longer needed as embeddings are pre-computed

let isInitialized = false;

async function initialize() {
    if (isInitialized) return; // Prevent re-initialization

    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY environment variable not set");
    }

    // Load pre-computed embeddings directly
    if (knowledgeBaseChunks.length === 0 || !knowledgeBaseEmbeddings) {
        try {
            console.log(`Loading pre-computed embeddings from ${PRECOMPUTED_EMBEDDINGS_PATH}...`);
            if (!fs.existsSync(PRECOMPUTED_EMBEDDINGS_PATH)) {
                throw new Error(`Pre-computed embeddings file not found at ${PRECOMPUTED_EMBEDDINGS_PATH}. Run the generation script first.`);
            }
            const cacheData = JSON.parse(fs.readFileSync(PRECOMPUTED_EMBEDDINGS_PATH, 'utf-8'));
            knowledgeBaseChunks = cacheData.chunks;
            knowledgeBaseEmbeddings = cacheData.embeddings;

            if (!knowledgeBaseChunks || !knowledgeBaseEmbeddings || knowledgeBaseChunks.length === 0 || knowledgeBaseEmbeddings.length === 0) {
                throw new Error("Pre-computed embeddings file is invalid or empty.");
            }

            console.log(`Loaded ${knowledgeBaseChunks.length} chunks and ${knowledgeBaseEmbeddings.length} embeddings.`);
            isInitialized = true; // Mark as initialized

        } catch (error) {
            console.error("Error loading pre-computed embeddings:", error);
            // Set to empty arrays to prevent partial state issues
            knowledgeBaseChunks = [];
            knowledgeBaseEmbeddings = null;
            isInitialized = false; // Ensure it can retry if applicable, though likely fatal
            throw error; // Re-throw the error to fail the function execution
        }
    } else {
        console.log("Embeddings already loaded.");
        isInitialized = true; // Mark as initialized if already loaded
    }
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

        console.log("Processing query:", query);
        const pipeline = await getPipeline();
        const queryEmbedding = (await pipeline(query, {
            pooling: 'mean',
            normalize: true,
            max_length: 512
        })).tolist()[0];

        // Find relevant chunks with memory-efficient processing
        const similarities = knowledgeBaseEmbeddings
            .map((embedding, index) => ({ index, score: cosineSimilarity(queryEmbedding, embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, TOP_K);

        // Build context efficiently
        let context = similarities
            .map(({ index }) => knowledgeBaseChunks[index])
            .join("\n\n");

        // Trim context if it exceeds token limit
        if (estimateTokens(context) > MAX_CONTEXT_TOKENS) {
            const words = context.split(/\s+/);
            context = words.slice(0, MAX_CONTEXT_TOKENS).join(' ');
        }

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
                        content: "You are a helpful chatbot assistant answering questions about Pratik Padiya based ONLY on the provided context. Be concise and professional. If the answer is not found in the context, say 'I don't have information about that based on the provided documents.' Do not make up information."
                    },
                    {
                        role: "user",
                        content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`
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
        return {
            statusCode: 200,
            body: JSON.stringify({ response: data.choices[0]?.message?.content || "Sorry, I couldn't generate a response." })
        };

    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: error.message || "An internal error occurred" })
        };
    }
};