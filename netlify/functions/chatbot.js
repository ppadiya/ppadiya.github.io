const fs = require('fs');
const path = require('path');

// --- Configuration ---
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt');
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CONTEXT_TOKENS = 1500;
const TOP_K = 2;
const BATCH_SIZE = 5;
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';
const CACHE_FILE = path.join(__dirname, 'embeddings_cache.json');

// --- Helper Functions ---
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

// --- Cache Management ---
async function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            console.log("Loading pre-computed embeddings from cache...");
            const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            return cache;
        }
    } catch (error) {
        console.warn('Cache load failed:', error);
    }
    return null;
}

async function saveCache(chunks, embeddings) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ chunks, embeddings }));
        console.log("Cache saved successfully");
    } catch (error) {
        console.warn('Cache save failed:', error);
    }
}

// --- Initialization ---
let pipelinePromise = null;
let knowledgeBaseChunks = [];
let knowledgeBaseEmbeddings = null;

async function getPipeline() {
    if (!pipelinePromise) {
        try {
            console.log("Initializing embedding pipeline...");
            const { pipeline } = await import('@xenova/transformers');
            pipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL, {
                quantized: true,
                progress_callback: null
            });
        } catch (error) {
            console.error('Pipeline initialization error:', error);
            throw error;
        }
    }
    return pipelinePromise;
}

async function processChunkBatch(pipeline, chunks, startIdx) {
    const batchChunks = chunks.slice(startIdx, startIdx + BATCH_SIZE);
    if (batchChunks.length === 0) return [];
    
    console.log(`Processing batch ${Math.floor(startIdx/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
    const embeddings = await pipeline(batchChunks, {
        pooling: 'mean',
        normalize: true
    });
    return embeddings.tolist();
}

async function initialize() {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY environment variable not set");
    }

    // Try to load from cache first
    const cache = await loadCache();
    if (cache) {
        console.log(`Loaded ${cache.chunks.length} chunks and ${cache.embeddings.length} embeddings.`);
        knowledgeBaseChunks = cache.chunks;
        knowledgeBaseEmbeddings = cache.embeddings;
        return;
    }

    // If no cache, process knowledge base
    if (knowledgeBaseChunks.length === 0 || !knowledgeBaseEmbeddings) {
        try {
            console.log("Loading knowledge base...");
            const knowledgeBaseText = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
            knowledgeBaseChunks = chunkText(knowledgeBaseText);
            
            const pipeline = await getPipeline();
            
            console.log("Generating embeddings...");
            knowledgeBaseEmbeddings = [];
            
            // Process in small batches
            for (let i = 0; i < knowledgeBaseChunks.length; i += BATCH_SIZE) {
                const batchEmbeddings = await processChunkBatch(pipeline, knowledgeBaseChunks, i);
                knowledgeBaseEmbeddings.push(...batchEmbeddings);
                
                // Save cache after each batch to preserve progress
                await saveCache(knowledgeBaseChunks, knowledgeBaseEmbeddings);
            }
            
            console.log("Initialization complete.");
        } catch (error) {
            console.error("Initialization error:", error);
            throw error;
        }
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
            normalize: true
        })).tolist()[0];

        // Find relevant chunks
        const similarities = knowledgeBaseEmbeddings
            .map((embedding, index) => ({ index, score: cosineSimilarity(queryEmbedding, embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, TOP_K);

        // Build context
        let context = similarities
            .map(({ index }) => knowledgeBaseChunks[index])
            .join("\n\n");

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