const fs = require('fs');
const path = require('path');

// --- Configuration ---
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../data/knowledge_base.txt');
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_CONTEXT_TOKENS = 3000;
const TOP_K = 3;
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';

// --- Helper Functions ---
function chunkText(text) {
    return text.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
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

// --- Initialization with lazy loading ---
let pipelinePromise = null;
let knowledgeBaseChunks = [];
let knowledgeBaseEmbeddings = null;

async function getPipeline() {
    if (!pipelinePromise) {
        const { pipeline } = await import('@xenova/transformers');
        pipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL, { quantized: true });
    }
    return pipelinePromise;
}

async function initialize() {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY environment variable not set");
    }

    if (knowledgeBaseChunks.length === 0 || !knowledgeBaseEmbeddings) {
        const knowledgeBaseText = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
        knowledgeBaseChunks = chunkText(knowledgeBaseText);
        const pipeline = await getPipeline();
        const embeddings = await pipeline(knowledgeBaseChunks, { pooling: 'mean', normalize: true });
        knowledgeBaseEmbeddings = embeddings.tolist();
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

        const pipeline = await getPipeline();
        const queryEmbedding = (await pipeline(query, { pooling: 'mean', normalize: true })).tolist()[0];

        // Find relevant chunks
        const similarities = knowledgeBaseEmbeddings
            .map((embedding, index) => ({ index, score: cosineSimilarity(queryEmbedding, embedding) }))
            .sort((a, b) => b.score - a.score);

        // Build context from top chunks
        let context = "";
        let currentTokens = 0;
        for (let i = 0; i < Math.min(TOP_K, similarities.length); i++) {
            const chunk = knowledgeBaseChunks[similarities[i].index];
            const chunkTokens = estimateTokens(chunk);
            if (currentTokens + chunkTokens <= MAX_CONTEXT_TOKENS) {
                context += chunk + "\n\n";
                currentTokens += chunkTokens;
            }
        }

        // Call OpenRouter API
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