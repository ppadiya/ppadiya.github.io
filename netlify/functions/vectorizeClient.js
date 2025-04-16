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
      
      // First try the unified approach with answer generation
      const response = await this.pipelinesApi.retrieveDocuments({
        organization: this.orgId,
        pipeline: this.pipelineId,
        retrieveDocumentsRequest: {
          question: query,
          numResults: options.topK || 8,
          rerank: true,
          generateAnswer: true // Enable answer generation
        }
      });

      console.log("Vectorize response:", JSON.stringify(response, null, 2));

      if (!response.documents?.length) {
        return {
          answer: "I couldn't find relevant information to answer your question. Could you please rephrase it?",
          documents: []
        };
      }

      // If we have a generated answer, use it as the primary response
      if (response.documents[0]?.generatedAnswer) {
        return {
          answer: response.documents[0].generatedAnswer,
          documents: response.documents
        };
      }

      // Otherwise, try to extract and format structured data
      const formattedResponse = this.createStructuredResponse(query, response.documents);
      return {
        answer: formattedResponse,
        documents: response.documents
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
    // Extract all sections and their data from documents
    const sections = this.extractSections(documents);
    
    // Try to find the most relevant section based on query similarity
    const relevantSection = this.findRelevantSection(query, sections);
    
    if (relevantSection) {
      return this.formatSection(relevantSection.type, relevantSection.data);
    }

    // If no specific section is found, create a general summary
    return this.createGeneralSummary(documents);
  }

  extractSections(documents) {
    const sections = new Map();

    documents.forEach(doc => {
      const text = doc.text || "";
      const chunks = text.split('----------------------------------------');
      
      chunks.forEach(chunk => {
        // Identify section type from content
        const sectionType = this.identifySectionType(chunk);
        if (!sectionType) return;

        // Parse section data
        const data = this.parseSectionData(sectionType, chunk);
        if (!sections.has(sectionType)) {
          sections.set(sectionType, []);
        }
        sections.get(sectionType).push(...data);
      });
    });

    return sections;
  }

  identifySectionType(chunk) {
    const indicators = {
      education: ['School Name:', 'Degree Name:', 'Education'],
      work: ['Company Name:', 'Title:', 'Description:', 'Positions'],
      certification: ['Certifications', 'Authority:', 'License Number:'],
      skills: ['Skills', 'Endorsement'],
      language: ['Languages', 'Proficiency:'],
      recommendation: ['Recommendations Received', 'Text:']
    };

    for (const [type, keywords] of Object.entries(indicators)) {
      if (keywords.some(keyword => chunk.includes(keyword))) {
        return type;
      }
    }
    return null;
  }

  parseSectionData(type, chunk) {
    const lines = chunk.split('\n').filter(Boolean);
    const data = [];
    let currentItem = {};

    switch (type) {
      case 'education':
        lines.forEach(line => {
          if (line.startsWith('School Name:')) {
            if (Object.keys(currentItem).length > 0) {
              data.push({...currentItem});
              currentItem = {};
            }
            currentItem.school = line.replace('School Name:', '').trim();
          } else if (line.startsWith('Degree Name:')) {
            currentItem.degree = line.replace('Degree Name:', '').trim();
          } else if (line.startsWith('Start Date:')) {
            currentItem.startDate = line.replace('Start Date:', '').trim();
          } else if (line.startsWith('End Date:')) {
            currentItem.endDate = line.replace('End Date:', '').trim();
          }
        });
        break;

      case 'work':
        lines.forEach(line => {
          if (line.startsWith('Company Name:')) {
            if (Object.keys(currentItem).length > 0) {
              data.push({...currentItem});
              currentItem = {};
            }
            currentItem.company = line.replace('Company Name:', '').trim();
          } else if (line.startsWith('Title:')) {
            currentItem.title = line.replace('Title:', '').trim();
          } else if (line.startsWith('Description:')) {
            currentItem.description = line.replace('Description:', '').trim();
          } else if (line.startsWith('Started On:')) {
            currentItem.startDate = line.replace('Started On:', '').trim();
          } else if (line.startsWith('Finished On:')) {
            currentItem.endDate = line.replace('Finished On:', '').trim();
          } else if (line.startsWith('Location:')) {
            currentItem.location = line.replace('Location:', '').trim();
          }
        });
        break;

      // Add other section types as needed
    }

    if (Object.keys(currentItem).length > 0) {
      data.push(currentItem);
    }

    return data;
  }

  findRelevantSection(query, sections) {
    const queryWords = new Set(query.toLowerCase().split(/\W+/));
    let bestMatch = { score: 0, type: null, data: null };

    for (const [type, data] of sections.entries()) {
      // Calculate relevance score based on keyword matches
      const typeWords = type.split('_');
      const matches = typeWords.filter(word => queryWords.has(word.toLowerCase())).length;
      const score = matches / typeWords.length;

      if (score > bestMatch.score) {
        bestMatch = { score, type, data };
      }
    }

    return bestMatch.score > 0 ? bestMatch : null;
  }

  formatSection(type, data) {
    switch (type) {
      case 'education':
        return this.formatEducation(data);
      case 'work':
        return this.formatWorkExperience(data);
      case 'certification':
        return this.formatCertifications(data);
      case 'skills':
        return this.formatSkills(data);
      case 'language':
        return this.formatLanguages(data);
      default:
        return this.formatGeneral(data);
    }
  }

  formatEducation(data) {
    // Sort by date (most recent first)
    data.sort((a, b) => {
      const dateA = a.endDate || a.startDate || '';
      const dateB = b.endDate || b.startDate || '';
      return new Date(dateB) - new Date(dateA);
    });

    return "Here's the educational background:\n\n" +
           data.map(edu => 
             `• ${edu.degree} from ${edu.school}` +
             (edu.startDate ? ` (${edu.startDate}${edu.endDate ? ` - ${edu.endDate}` : ''})` : '')
           ).join('\n');
  }

  formatWorkExperience(data) {
    // Sort by date (most recent first)
    data.sort((a, b) => {
      const dateA = a.endDate || a.startDate || '';
      const dateB = b.endDate || b.startDate || '';
      return new Date(dateB) - new Date(dateA);
    });

    return "Here's the work experience:\n\n" +
           data.map(exp => {
             const parts = [];
             if (exp.company) parts.push(`Company: ${exp.company}`);
             if (exp.title) parts.push(`Title: ${exp.title}`);
             if (exp.location) parts.push(`Location: ${exp.location}`);
             if (exp.startDate || exp.endDate) {
               parts.push(`Period: ${[exp.startDate, exp.endDate].filter(Boolean).join(' - ')}`);
             }
             if (exp.description) parts.push(`Description: ${exp.description}`);
             return parts.join('\n');
           }).join('\n\n');
  }

  createGeneralSummary(documents) {
    // Create a summary from the most relevant chunks
    return documents
      .filter(doc => doc.text && doc.similarity > 0.5)
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
  }
}

module.exports = { VectorizeClient };