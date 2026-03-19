const { VectorizeClient } = require('./vectorizeClient');

const TOP_K = 4;
const REQUEST_TIMEOUT = 30000;

const vectorizeClient = new VectorizeClient();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        if (!process.env.TOKEN) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Configuration error - TOKEN missing' })
            };
        }

        const { query } = JSON.parse(event.body);
        if (!query?.trim()) {
            throw new Error('Missing or invalid query');
        }

        const result = await Promise.race([
            vectorizeClient.generateResponse({ query, options: { topK: TOP_K } }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
            )
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                response: result.answer,
                ...(result.isResearchResult ? { isResearchResult: true } : {
                    debug: {
                        numDocuments: result.documents?.length || 0,
                        topScore: result.documents?.[0]?.score || 0
                    }
                })
            })
        };

    } catch (error) {
        const errorMessage = error.message?.includes('timeout')
            ? 'The request took too long to process. Please try again with a simpler question.'
            : 'An error occurred while processing your request. Please try again.';

        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};
