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
      
      // First, get relevant documents
      const response = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          numResults: options.topK || 4,
          rerank: true
        }
      });

      // Extract and format the context from documents
      const context = (response.documents || [])
        .map(doc => doc.text)
        .join('\n\n');

      // Now use the LLM to generate an answer based on the context
      const llmResponse = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          context: context,
          generateAnswer: true,
          llmConfig: {
            temperature: 0.7,
            model: "gpt-3.5-turbo",
            systemPrompt: "You are a helpful assistant answering questions about Pratik Padiya based on the provided context. Be specific and use details from the context. If information is not in the context, say you don't have that information."
          }
        }
      });

      console.log("LLM Response:", JSON.stringify(llmResponse, null, 2));

      // If we get an answer, return it along with the supporting documents
      if (llmResponse.answer) {
        return {
          answer: llmResponse.answer,
          documents: response.documents || []
        };
      }

      // If no direct answer but we have documents, create a summary
      if (response.documents && response.documents.length > 0) {
        // Create a summary based on the most relevant documents
        const summary = this.createSummaryFromDocuments(response.documents);
        return {
          answer: summary,
          documents: response.documents
        };
      }

      return {
        answer: "I couldn't find specific information to answer your question. Could you please rephrase it?",
        documents: []
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

  createSummaryFromDocuments(documents) {
    // Get the most relevant information from documents
    const relevantInfo = documents
      .filter(doc => doc.text && doc.text.trim().length > 0)
      .map(doc => {
        // Extract key information based on document content
        if (doc.text.includes("Company Name:")) {
          return doc.text.split('\n').filter(line => 
            line.startsWith("Company Name:") || 
            line.startsWith("Title:") || 
            line.startsWith("Description:")
          ).join('\n');
        }
        return doc.text;
      })
      .join('\n\n');

    // If we have work experience info
    if (relevantInfo.toLowerCase().includes("experience") || relevantInfo.toLowerCase().includes("company")) {
      return `Based on the available information, here's what I found:\n\n${relevantInfo}`;
    }

    // For general queries about the person
    return `Here's what I found about Pratik:\n\n${relevantInfo}`;
  }
}

module.exports = { VectorizeClient };