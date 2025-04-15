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
const OUTPUT_KB_FILE = path.join(__dirname, '../data/knowledge_base.json');

// --- Improved Semantic Chunking and Metadata Extraction ---
function parseKnowledgeBase(text) {
    const sections = text.split(/-{5,}/g); // Split by 5 or more dashes
    let chunks = [];
    for (let section of sections) {
        section = section.trim();
        if (!section) continue;
        // Extract section title (first non-empty line)
        const lines = section.split('\n').map(l => l.trim());
        const title = lines.find(l => l.length > 0) || 'Untitled';
        // Use section title as tag, and try to extract dates if present
        let tags = [title.toLowerCase().replace(/[^a-z0-9]+/g, '_')];
        let dateMatch = section.match(/\d{4}([/-]\d{2}([/-]\d{2})?)?/g);
        let dates = dateMatch ? dateMatch : [];
        // Remove title from content
        const content = lines.slice(1).join('\n').trim();
        // Further split if section is very large
        const subchunks = content.length > 1200 ? content.match(/(.|\n){1,1000}(?=\n|$)/g) : [content];
        for (let sub of subchunks) {
            if (sub && sub.trim().length > 0) {
                chunks.push({
                    text: sub.trim(),
                    metadata: {
                        title,
                        tags,
                        dates
                    }
                });
            }
        }
    }
    return chunks;
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
        const knowledgeBaseChunks = parseKnowledgeBase(knowledgeBaseText);
        console.log(`Knowledge base split into ${knowledgeBaseChunks.length} semantic chunks.`);

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
            const batchTexts = knowledgeBaseChunks.slice(i, i + BATCH_SIZE).map(c => c.text);
            const batchEmbeddings = await processChunkBatch(extractor, batchTexts, 0);
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

        fs.writeFileSync(OUTPUT_KB_FILE, JSON.stringify(knowledgeBaseChunks, null, 2));

        console.log("Embeddings generated and saved successfully!");

    } catch (error) {
        console.error("Error generating embeddings:", error);
        process.exit(1); // Exit with error code
    }
}

// Run the generation function
generateAndSaveEmbeddings();