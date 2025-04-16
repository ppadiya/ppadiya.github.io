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
    // Look for exact section headers with clear boundaries
    const trimmedChunk = chunk.trim();
    
    if (trimmedChunk.startsWith('Education\n\n') || trimmedChunk.includes('\nEducation\n\n')) {
      return 'education';
    }
    if (trimmedChunk.startsWith('Certifications\n\n') || trimmedChunk.includes('\nCertifications\n\n')) {
      return 'certification';
    }
    if (trimmedChunk.includes('Positions\n\n') || trimmedChunk.startsWith('Company Name:')) {
      return 'work';
    }
    if (trimmedChunk.startsWith('Languages\n\n') || trimmedChunk.includes('\nLanguages\n\n')) {
      return 'language';
    }
    return null;
  }

  parseSectionData(type, chunk) {
    // Extract only the relevant section, stopping at the next section boundary
    const sections = chunk.split('----------------------------------------');
    const relevantSection = sections.find(section => 
      section.trim().startsWith(type.charAt(0).toUpperCase() + type.slice(1)) ||
      section.includes(`\n${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`)
    );

    if (!relevantSection) return [];

    const lines = relevantSection.split('\n').filter(Boolean);
    const data = [];
    let currentItem = {};
    let isInRelevantSection = false;

    for (const line of lines) {
      // Start collecting data after the section header
      if (line.trim() === type.charAt(0).toUpperCase() + type.slice(1)) {
        isInRelevantSection = true;
        continue;
      }

      if (!isInRelevantSection) continue;

      // Stop at the next section boundary
      if (line.includes('----------------------------------------')) break;

      switch (type) {
        case 'education':
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
          break;
        // ... other cases remain unchanged ...
      }
    }

    if (Object.keys(currentItem).length > 0) {
      data.push(currentItem);
    }

    return data;
  }

  findRelevantSection(query, sections) {
    const queryWords = new Set(query.toLowerCase().split(/\W+/));
    let bestMatch = { score: 0, type: null, data: null };

    // More specific keywords for each section
    const sectionKeywords = {
      education: ['education', 'degree', 'university', 'college', 'school', 'studied', 'qualification', 'academic', 'graduate', 'graduated'],
      certification: ['certification', 'certificate', 'certified', 'license', 'training'],
      work: ['work', 'job', 'career', 'experience', 'position', 'employment', 'company'],
      language: ['language', 'speak', 'linguistic']
    };

    for (const [type, data] of sections.entries()) {
      const keywords = sectionKeywords[type] || [];
      const matches = keywords.filter(keyword => queryWords.has(keyword)).length;
      const score = matches / Math.min(keywords.length, queryWords.size);

      if (score > bestMatch.score) {
        bestMatch = { score, type, data };
      }
    }

    // Higher threshold to ensure better matches
    return bestMatch.score > 0.15 ? bestMatch : null;
  }

  formatSection(type, data) {
    switch (type) {
      case 'certification':
        return this.formatCertifications(data);
      case 'education':
        return this.formatEducation(data);
      case 'work':
        return this.formatWorkExperience(data);
      case 'skills':
        return this.formatSkills(data);
      case 'language':
        return this.formatLanguages(data);
      default:
        return this.formatGeneral(data);
    }
  }

  formatEducation(data) {
    if (!data || data.length === 0) {
      return "No educational information found.";
    }

    // Sort by end date (most recent first)
    data.sort((a, b) => {
      const dateA = a.endDate || a.startDate || '';
      const dateB = b.endDate || b.startDate || '';
      return new Date(dateB) - new Date(dateA);
    });

    let response = "Here's Pratik's educational background:\n\n";
    
    // Format each education entry
    data.forEach(edu => {
      response += `${edu.degree} from ${edu.school}\n`;
      if (edu.startDate || edu.endDate) {
        response += `Period: ${[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}\n`;
      }
      response += '\n';
    });

    return response.trim();
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

  formatCertifications(data) {
    // Sort by date (most recent first)
    data.sort((a, b) => {
      const dateA = a.endDate || a.startDate || '';
      const dateB = b.endDate || b.startDate || '';
      return new Date(dateB) - new Date(dateA);
    });

    // Group certifications by authority
    const groupedCerts = data.reduce((groups, cert) => {
      const authority = cert.authority || 'Other';
      if (!groups[authority]) {
        groups[authority] = [];
      }
      groups[authority].push(cert);
      return groups;
    }, {});

    let response = "Here are Pratik's professional certifications:\n\n";

    Object.entries(groupedCerts).forEach(([authority, certs]) => {
      response += `${authority}:\n`;
      certs.forEach(cert => {
        let certLine = `• ${cert.name}`;
        if (cert.startDate || cert.endDate) {
          certLine += ' (';
          if (cert.startDate) certLine += `Started: ${cert.startDate}`;
          if (cert.endDate) certLine += `${cert.startDate ? ', ' : ''}Completed: ${cert.endDate}`;
          certLine += ')';
        }
        if (cert.licenseNumber) {
          certLine += ` - License: ${cert.licenseNumber}`;
        }
        response += `${certLine}\n`;
      });
      response += '\n';
    });

    return response.trim();
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