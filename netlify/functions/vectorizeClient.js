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
      console.log("Sending query to Vectorize:", query);
      
      const response = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          numResults: options.topK || 4,
          generateAnswer: true,
          rerank: true,
          temperature: 0.7,
          conversationHistory: [], // Add empty history to ensure fresh context
          modelName: "gpt-3.5-turbo", // Specify model explicitly
          stream: false
        }
      });
      
      // Debug logging
      console.log("Raw Vectorize response:", JSON.stringify(response, null, 2));
      
      // Check all possible locations for the answer
      const answer = response.answer || 
                     response.generated_answer || 
                     response.generatedAnswer || 
                     response.aiAnswer ||
                     response.completion;
      
      console.log("Extracted answer:", answer);
      console.log("Found documents:", response.documents?.length || 0);

      if (!answer && (!response.documents || response.documents.length === 0)) {
        console.log("No answer or documents found in response");
        return {
          answer: "I couldn't find relevant information to answer your question. Could you please rephrase it?",
          documents: []
        };
      }

      return {
        answer: answer || "I couldn't generate a response based on the available information.",
        documents: (response.documents || []).map(doc => ({
          text: doc.content || doc.text || doc.document || '',
          metadata: doc.metadata || {},
          score: doc.score || doc.relevanceScore || 0
        }))
      };
    } catch (error) {
      console.error("Vectorize API error:", error);
      console.error("Error response:", error?.response);
      if (error?.response) {
        const errorText = await error.response.text().catch(() => "Could not read error response");
        console.error("Error response text:", errorText);
      }
      throw error;
    }
  }
}

module.exports = { VectorizeClient };