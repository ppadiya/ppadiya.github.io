const { Configuration, PipelinesApi } = require("@vectorize-io/vectorize-client");

class VectorizeClient {
  constructor() {
    const config = new Configuration({
      accessToken: process.env.TOKEN,
      basePath: "https://api.vectorize.io/v1"
    });
    this.pipelinesApi = new PipelinesApi(config);
    this.orgId = "281a4cfe-3588-4464-8f4b-de6fdefe6109";
    this.pipelineId = "aipff73a-ec21-45ae-8f37-f867e52184ee";
  }

  async generateResponse({ query, options = {} }) {
    try {
      console.log("Sending query to Vectorize:", query);

      // First try deep research for comprehensive answers
      try {
        const researchResponse = await this.pipelinesApi.startDeepResearch({
          organization: this.orgId,
          pipeline: this.pipelineId,
          startDeepResearchRequest: {
            query: query,
            webSearch: false
          }
        });

        // Poll for research results
        const researchResult = await this.pollDeepResearchResult(researchResponse.researchId);
        if (researchResult.success) {
          return {
            answer: researchResult.markdown,
            isResearchResult: true
          };
        }
      } catch (researchError) {
        console.log("Deep research not available, falling back to retrieval:", researchError.message);
      }

      // Fall back to standard document retrieval
      const response = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          numResults: options.topK || 4,
          generateAnswer: true,
          rerank: true
        }
      });

      console.log("Vectorize response:", JSON.stringify(response, null, 2));

      if (response.documents?.length > 0) {
        const formattedResponse = this.createStructuredResponse(query, response.documents);
        return {
          answer: formattedResponse,
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

  async pollDeepResearchResult(researchId, maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.pipelinesApi.getDeepResearchResult({
        organization: this.orgId,
        pipeline: this.pipelineId,
        researchId: researchId
      });

      if (result.ready) {
        return result.data;
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("Research timed out");
  }

  createStructuredResponse(query, documents) {
    const isExperienceQuery = query.toLowerCase().includes('experience') || 
                             query.toLowerCase().includes('work') ||
                             query.toLowerCase().includes('job');
    
    const isSkillsQuery = query.toLowerCase().includes('skill') || 
                         query.toLowerCase().includes('expertise') ||
                         query.toLowerCase().includes('capable');

    if (isExperienceQuery) {
      const workExperience = documents
        .filter(doc => doc.text && doc.text.includes('Company Name:'))
        .map(doc => {
          const lines = doc.text.split('\n');
          const experience = {
            company: lines.find(l => l.startsWith('Company Name:'))?.replace('Company Name:', '').trim(),
            title: lines.find(l => l.startsWith('Title:'))?.replace('Title:', '').trim(),
            location: lines.find(l => l.startsWith('Location:'))?.replace('Location:', '').trim(),
            period: [
              lines.find(l => l.startsWith('Started On:'))?.replace('Started On:', '').trim(),
              lines.find(l => l.startsWith('Finished On:'))?.replace('Finished On:', '').trim()
            ].filter(Boolean).join(' - '),
            description: lines.find(l => l.startsWith('Description:'))?.replace('Description:', '').trim()
          };
          
          return Object.entries(experience)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
            .join('\n');
        })
        .join('\n\n');

      return workExperience || "I couldn't find specific work experience information.";
    }

    if (isSkillsQuery) {
      const skillsDoc = documents.find(doc => doc.text && doc.text.includes('Skills'));
      if (skillsDoc) {
        const skills = skillsDoc.text.split('\n')
          .find(line => line.startsWith('Skills'))
          ?.replace('Skills', '')
          .split(',')
          .map(skill => skill.trim())
          .filter(Boolean)
          .join('\n- ');
        
        return skills ? `Here are Pratik's key skills:\n- ${skills}` : "I couldn't find specific skills information.";
      }
    }

    // For general queries, first try to use the generated answer if available
    if (documents[0]?.generatedAnswer) {
      return documents[0].generatedAnswer;
    }

    // Otherwise, create a summary from the documents
    const summary = documents
      .filter(doc => doc.text && (doc.text.includes('Description:') || doc.text.includes('Text:')))
      .map(doc => {
        const text = doc.text.split('\n')
          .filter(line => 
            !line.startsWith('Creation Date:') && 
            !line.startsWith('Status:') &&
            line.trim() !== '----------------------------------------'
          )
          .join('\n');
        return text;
      })
      .slice(0, 2)
      .join('\n\n');

    return summary || "I couldn't find relevant information to answer your question.";
  }
}

module.exports = { VectorizeClient };