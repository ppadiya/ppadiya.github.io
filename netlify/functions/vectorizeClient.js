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
      
      const response = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          numResults: options.topK || 8, // Increased to get more comprehensive results
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

  createStructuredResponse(query, documents) {
    const isExperienceQuery = query.toLowerCase().includes('experience') || 
                             query.toLowerCase().includes('work') ||
                             query.toLowerCase().includes('job');
    
    if (isExperienceQuery) {
      // Extract all work experiences from different chunks
      const experiences = [];
      documents.forEach(doc => {
        const text = doc.text || "";
        const entries = text.split('\n\n');
        
        entries.forEach(entry => {
          if (entry.includes('Company Name:') || entry.includes('Title:')) {
            const lines = entry.split('\n');
            const exp = {
              company: lines.find(l => l.startsWith('Company Name:'))?.replace('Company Name:', '').trim(),
              title: lines.find(l => l.startsWith('Title:'))?.replace('Title:', '').trim(),
              location: lines.find(l => l.startsWith('Location:'))?.replace('Location:', '').trim(),
              startDate: lines.find(l => l.startsWith('Started On:'))?.replace('Started On:', '').trim(),
              endDate: lines.find(l => l.startsWith('Finished On:'))?.replace('Finished On:', '').trim(),
              description: lines.find(l => l.startsWith('Description:'))?.replace('Description:', '').trim()
            };
            
            // Only add if we have at least company or title
            if (exp.company || exp.title) {
              experiences.push(exp);
            }
          }
        });
      });

      // Sort experiences by date (most recent first)
      experiences.sort((a, b) => {
        const dateA = a.endDate || a.startDate || '';
        const dateB = b.endDate || b.startDate || '';
        return new Date(dateB) - new Date(dateA);
      });

      // Remove duplicates based on company name and start date
      const uniqueExperiences = experiences.filter((exp, index, self) =>
        index === self.findIndex(e => 
          e.company === exp.company && 
          e.startDate === exp.startDate
        )
      );

      // Format the response
      const formattedExperiences = uniqueExperiences.map(exp => {
        const parts = [];
        if (exp.company) parts.push(`Company: ${exp.company}`);
        if (exp.title) parts.push(`Title: ${exp.title}`);
        if (exp.location) parts.push(`Location: ${exp.location}`);
        
        // Format period
        const period = [exp.startDate, exp.endDate]
          .filter(Boolean)
          .join(' - ');
        if (period) parts.push(`Period: ${period}`);
        
        if (exp.description) parts.push(`Description: ${exp.description}`);
        
        return parts.join('\n');
      });

      const intro = "Here's a comprehensive overview of Pratik's work experience, ordered from most recent to oldest:\n\n";
      return intro + formattedExperiences.join('\n\n');
    }

    // Handle other query types similarly to before
    const isSkillsQuery = query.toLowerCase().includes('skill') || 
                         query.toLowerCase().includes('expertise') ||
                         query.toLowerCase().includes('capable');

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

    // For general queries, create a summary from recommendations and descriptions
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