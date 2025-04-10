// scripts/generate_embeddings.js
const fs = require('fs');
const path = require('path');

// Configure transformers to use local cache (adjust if needed)
process.env.TRANSFORMERS_CACHE = path.join(__dirname, '../.cache/transformers');
process.env.HF_HUB_CACHE = path.join(__dirname, '../.cache/huggingface'); // Recommended for newer versions

// --- Configuration (Match your function's config) ---
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../data/knowledge_base.txt');
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const BATCH_SIZE = 5; // Keep batching for memory efficiency locally too
const OUTPUT_CACHE_FILE = path.join(__dirname, '../data/embeddings.json');

// --- Helper Functions (Copied from chatbot.js) ---
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

async function processChunkBatch(pipeline, chunks, startIdx) {
    const batchChunks = chunks.slice(startIdx, startIdx + BATCH_SIZE);
    if (batchChunks.length === 0) return [];

    console.log(`Processing batch ${Math.floor(startIdx/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
    const embeddings = await pipeline(batchChunks, {
        pooling: 'mean',
        normalize: true,
        max_length: 512 // Ensure consistency
    });
    // Use .tolist() or equivalent based on the pipeline output structure
    // Adjust if the local pipeline output differs slightly from the Netlify environment
     try {
        return embeddings.tolist();
    } catch (e) {
        // Handle potential differences in output structure if needed
        console.warn("Could not call .tolist(), attempting direct data access. Structure:", embeddings);
        // Example fallback (adjust based on actual structure if tolist fails):
        if (embeddings && embeddings.data) {
             // Reshape Float32Array data if necessary
             const embeddingSize = embeddings.dims[1];
             const numEmbeddings = embeddings.dims[0];
             const reshapedEmbeddings = [];
             for (let i = 0; i < numEmbeddings; i++) {
                 reshapedEmbeddings.push(Array.from(embeddings.data.slice(i * embeddingSize, (i + 1) * embeddingSize)));
             }
             return reshapedEmbeddings;
        }
        throw new Error("Failed to extract embeddings from pipeline output.");
    }
}

async function generateAndSaveEmbeddings() {
    try {
        console.log("Importing transformers pipeline...");
        // Ensure you have @xenova/transformers installed as a dev dependency
        const { pipeline } = await import('@xenova/transformers');

        console.log("Loading knowledge base...");
        const knowledgeBaseText = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
        const knowledgeBaseChunks = chunkText(knowledgeBaseText);
        console.log(`Knowledge base split into ${knowledgeBaseChunks.length} chunks.`);

        console.log("Initializing pipeline...");
        // Use quantized=false locally if you have enough resources for better accuracy,
        // but stick to quantized=true if you want to match the Netlify env closely.
        const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
             quantized: true, // Match Netlify function setting
             // cache_dir: process.env.TRANSFORMERS_CACHE // Optional: specify cache dir
        });

        console.log("Generating embeddings (this might take a while)...");
        let knowledgeBaseEmbeddings = [];

        // Process in batches
        for (let i = 0; i < knowledgeBaseChunks.length; i += BATCH_SIZE) {
            const batchEmbeddings = await processChunkBatch(extractor, knowledgeBaseChunks, i);
            knowledgeBaseEmbeddings.push(...batchEmbeddings);
             // Optional: Add a small delay if hitting rate limits or for stability
             // await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`Generated ${knowledgeBaseEmbeddings.length} embeddings.`);

        // Ensure output directory exists
        const outputDir = path.dirname(OUTPUT_CACHE_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
         // Ensure cache directory exists
        const cacheDir = path.dirname(process.env.TRANSFORMERS_CACHE);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }


        console.log(`Saving embeddings to ${OUTPUT_CACHE_FILE}...`);
        fs.writeFileSync(OUTPUT_CACHE_FILE, JSON.stringify({
            chunks: knowledgeBaseChunks,
            embeddings: knowledgeBaseEmbeddings
        }, null, 2)); // Pretty print JSON

        console.log("Embeddings generated and saved successfully!");

    } catch (error) {
        console.error("Error generating embeddings:", error);
        process.exit(1); // Exit with error code
    }
}

// Run the generation function
generateAndSaveEmbeddings();