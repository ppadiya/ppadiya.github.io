const fs = require('fs');
const path = require('path');

// Configure transformers to use RAM-based caching
process.env.TRANSFORMERS_CACHE = '/tmp';
process.env.TORCH_HOME = '/tmp';

// --- Configuration ---
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt');
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CONTEXT_TOKENS = 1500; // Further reduced to save memory
const TOP_K = 2; // Keep at 2 to save memory
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';
const BATCH_SIZE = 5; // Process embeddings in smaller batches

// --- Helper Functions ---
function chunkText(text) {
    // Create smaller chunks to reduce memory usage
    const paragraphs = text.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    // Further split long paragraphs if needed
    let chunks = [];
    for (const paragraph of paragraphs) {
        if (paragraph.length > 500) {
            // Split into smaller chunks of ~500 chars
            const sentences = paragraph.split(/(?<=\.|\?|\!)\s+/);
            let currentChunk = '';
            for (const sentence of sentences) {
                if ((currentChunk + sentence).length > 500) {
                    if (currentChunk) chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                } else {
                    currentChunk += ' ' + sentence;
                }
            }
            if (currentChunk) chunks.push(currentChunk.trim());
        } else {
            chunks.push(paragraph);
        }
    }
    return chunks;
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
    return Math.ceil(text.split(/\s+/).length * 1.3); // More conservative token estimate
}

// --- Initialization with optimized loading ---
let pipelinePromise = null;
let knowledgeBaseChunks = [];
let knowledgeBaseEmbeddings = [];
let isInitialized = false;

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

// Process embeddings in batches to reduce memory usage
async function processEmbeddingsInBatches(pipeline, chunks) {
    const embeddings = [];
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
        
        const batchEmbeddings = await pipeline(batchChunks, {
            pooling: 'mean',
            normalize: true,
            max_length: 256 // Reduced from 512 to save memory
        });
        
        // Add batch embeddings to our collection
        const batchEmbeddingsList = batchEmbeddings.tolist();
        for (const embedding of batchEmbeddingsList) {
            embeddings.push(embedding);
        }
        
        // Force garbage collection between batches
        if (global.gc) {
            global.gc();
        }
    }
    
    return embeddings;
}

async function initialize() {
    if (isInitialized) return;
    
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY environment variable not set");
    }

    try {
        console.log("Loading knowledge base...");
        const knowledgeBaseText = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
        knowledgeBaseChunks = chunkText(knowledgeBaseText);
        
        console.log("Initializing pipeline...");
        const pipeline = await getPipeline();
        
        console.log("Generating embeddings...");
        knowledgeBaseEmbeddings = await processEmbeddingsInBatches(pipeline, knowledgeBaseChunks);
        
        isInitialized = true;
        console.log("Initialization complete.");
    } catch (error) {
        console.error("Initialization error:", error);
        throw error;
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
            max_length: 256 // Reduced from 512 to save memory
        })).tolist()[0];

        // Find relevant chunks with memory-efficient processing
        const similarities = [];
        for (let i = 0; i < knowledgeBaseEmbeddings.length; i++) {
            const score = cosineSimilarity(queryEmbedding, knowledgeBaseEmbeddings[i]);
            similarities.push({ index: i, score });
        }
        
        // Sort and get top results
        similarities.sort((a, b) => b.score - a.score);
        const topResults = similarities.slice(0, TOP_K);

        // Build context efficiently
        let context = topResults
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