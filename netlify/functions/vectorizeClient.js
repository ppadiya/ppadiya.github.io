const { Configuration, PipelinesApi } = require("@vectorize-io/vectorize-client");

class VectorizeClient {
  constructor() {
    const config = new Configuration({
      accessToken: process.env.TOKEN,
      basePath: "https://api.vectorize.io/v1",
    });
    this.pipelinesApi = new PipelinesApi(config);
    this.orgId = "281a4cfe-3588-4464-8f4b-de6fdefe6109";
    this.pipelineId = "aipff73a-ec21-45ae-8f37-f867e52184ee";
  }

  async generateResponse({ query, options = {} }) {
    try {
      const response = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          numResults: options.topK || 4,
          generateAnswer: true, // Enable answer generation
          rerank: true, // Enable reranking for better relevance
          stream: false // Get complete response at once
        }
      });
      
      return {
        answer: response.answer || "I don't have enough information to answer that question.",
        documents: (response.documents || []).map(doc => ({
          text: doc.content || doc.text || '',
          metadata: doc.metadata || {},
          score: doc.score || doc.relevanceScore || 0
        }))
      };
    } catch (error) {
      console.error("Vectorize API error:", error?.response);
      if (error?.response) {
        console.error(await error.response.text().catch(() => "Could not read error response"));
      }
      throw error;
    }
  }
}

module.exports = { VectorizeClient };