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
          rerank: true,
          generateAnswer: true,
          taskDescription: "You are an AI assistant helping users learn about Pratik Padiya. Generate detailed responses based on the retrieved documents. If the information is not in the documents, say you don't have that information.",
          answerConfig: {
            temperature: 0.7,
            maxLength: 1000,
            topK: 4,
            includeMetadata: true,
            includeSourceText: true
          }
        }
      });

      console.log("Vectorize response:", JSON.stringify(response, null, 2));
      
      // If we have a generated answer, return it
      if (response.generatedAnswer) {
        return {
          answer: response.generatedAnswer,
          documents: response.documents || []
        };
      }

      // If we have documents but no generated answer, create a summary
      if (response.documents?.length > 0) {
        const summary = this.createSummaryFromDocuments(response.documents);
        return {
          answer: summary,
          documents: response.documents
        };
      }

      return {
        answer: "I couldn't find relevant information to answer your question. Could you please rephrase it?",
        documents: []
      };
    } catch (error) {
      console.error("Vectorize API error:", error);
      if (error?.response) {
        console.error("Error response:", await error.response.text().catch(() => "Could not read error response"));
      }
      throw error;
    }
  }

  createSummaryFromDocuments(documents) {
    // Get the most relevant information from documents
    const relevantInfo = documents
      .filter(doc => doc.text && doc.text.trim().length > 0)
      .map(doc => {
        const text = doc.text || doc.content || "";
        // Extract key information based on document content
        if (text.includes("Company Name:") || text.includes("Title:")) {
          return text.split('\n')
            .filter(line => 
              line.startsWith("Company Name:") || 
              line.startsWith("Title:") || 
              line.startsWith("Description:") ||
              line.startsWith("Location:") ||
              line.startsWith("Started On:")
            ).join('\n');
        }
        return text;
      })
      .join('\n\n');

    // If we have work experience info
    if (relevantInfo.toLowerCase().includes("experience") || relevantInfo.toLowerCase().includes("company")) {
      return `Based on the available information, here's what I found about Pratik's experience:\n\n${relevantInfo}`;
    }

    // For general queries about the person
    return `Here's what I found about Pratik:\n\n${relevantInfo}`;
  }
}

module.exports = { VectorizeClient };