const fs = require('fs');
const path = require('path');
const { VectorizeClient } = require('./vectorizeClient');

// --- Configuration ---
const TOP_K = 4;
const REQUEST_TIMEOUT = 30000; // Increased to 30s to accommodate deep research

// Initialize Vectorize client
const vectorizeClient = new VectorizeClient();

// --- Helper Functions ---
function logToFile(message, data) {
    try {
        const logEntry = `${new Date().toISOString()} - ${message}\n${JSON.stringify(data, null, 2)}\n\n`;
        fs.appendFileSync(path.join(__dirname, 'debug.log'), logEntry);
    } catch (e) { /* ignore */ }
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        if (!process.env.TOKEN) {
            console.error("Missing Vectorize token");
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "Configuration error - TOKEN missing" }) 
            };
        }

        const { query } = JSON.parse(event.body);
        if (!query?.trim()) {
            throw new Error("Missing or invalid query");
        }

        console.log("Processing query:", query);
        logToFile("Incoming query", { query });

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

        logToFile("Vectorize response", result);

        // Return appropriate response based on type
        if (result.isResearchResult) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    response: result.answer,
                    isResearchResult: true
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                response: result.answer,
                debug: {
                    numDocuments: result.documents?.length || 0,
                    topScore: result.documents?.[0]?.score || 0
                }
            })
        };

    } catch (error) {
        console.error("Error:", error);
        logToFile("Error occurred", { error: error.message, stack: error.stack });
        
        const errorMessage = error.message?.includes('timeout') 
            ? "The request took too long to process. Please try again with a simpler question."
            : "An error occurred while processing your request. Please try again.";
        
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                error: errorMessage,
                debug: { errorType: error.name }
            })
        };
    }
};