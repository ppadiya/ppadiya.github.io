const { VectorizeClient } = require('./vectorizeClient');

exports.handler = async (event) => {
  try {
    // Check if Vectorize token is set
    if (!process.env.TOKEN) {
      console.error("Missing Vectorize token in environment variable");
      return { 
        statusCode: 500, 
        body: JSON.stringify({ 
          error: "Server configuration error", 
          message: "Vectorize TOKEN is missing" 
        }) 
      };
    }

    const vectorizeClient = new VectorizeClient();
    
    // Simple test query
    const results = await vectorizeClient.search({
      query: "test query",
      topK: 1
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Vectorize connection successful",
        resultsFound: results.matches?.length || 0,
        firstResult: results.matches && results.matches.length > 0 ? {
          score: results.matches[0].score,
          hasMetadata: !!results.matches[0].metadata
        } : null
      })
    };
  } catch (error) {
    console.error("Vectorize connection error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to connect to Vectorize",
        details: error.response?.data || error.message
      })
    };
  }
}