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
          numResults: options.topK || 8,
          rerank: true
        }
      });

      console.log("Vectorize response:", JSON.stringify(response, null, 2));

      if (!response.documents?.length) {
        return {
          answer: "I couldn't find relevant information to answer your question. Could you please rephrase it?",
          documents: []
        };
      }

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
    const queryType = this.identifyQueryType(query);
    if (!queryType) return this.createGeneralSummary(documents);

    const relevantData = this.extractRelevantData(queryType, documents);
    return this.formatResponse(queryType, relevantData);
  }

  identifyQueryType(query) {
    const queryLower = query.toLowerCase();
    const typePatterns = {
      certification: ['certification', 'certificate', 'certified'],
      education: ['education', 'degree', 'university', 'school', 'study'],
      work: ['work', 'job', 'career', 'experience', 'position'],
      skill: ['skill', 'expertise', 'capable', 'competency'],
      language: ['language', 'speak', 'linguistic']
    };

    for (const [type, patterns] of Object.entries(typePatterns)) {
      if (patterns.some(pattern => queryLower.includes(pattern))) {
        return type;
      }
    }
    return null;
  }

  extractRelevantData(type, documents) {
    const sectionMarker = '----------------------------------------';
    let relevantData = [];

    for (const doc of documents) {
      if (!doc.text) continue;

      const sections = doc.text.split(sectionMarker);
      for (const section of sections) {
        const cleanSection = section.trim();
        
        // Check if this section matches the type we're looking for
        if (this.isSectionRelevant(type, cleanSection)) {
          const extractedData = this.parseSectionData(type, cleanSection);
          if (extractedData.length > 0) {
            relevantData.push(...extractedData);
          }
        }
      }
    }

    return this.deduplicateData(relevantData);
  }

  isSectionRelevant(type, section) {
    const sectionHeaders = {
      certification: ['Certifications'],
      education: ['Education'],
      work: ['Positions', 'Work Experience'],
      skill: ['Skills'],
      language: ['Languages']
    };

    const headers = sectionHeaders[type] || [];
    return headers.some(header => 
      section.startsWith(header + '\n') || 
      section.includes('\n' + header + '\n')
    );
  }

  parseSectionData(type, section) {
    const lines = section.split('\n').filter(Boolean);
    const data = [];
    let currentItem = {};
    let isParsingItem = false;

    for (const line of lines) {
      switch (type) {
        case 'certification':
          if (line.startsWith('Name:')) {
            if (Object.keys(currentItem).length > 0) {
              data.push({...currentItem});
              currentItem = {};
            }
            currentItem.name = line.replace('Name:', '').trim();
            isParsingItem = true;
          } else if (isParsingItem) {
            if (line.startsWith('Authority:')) {
              currentItem.authority = line.replace('Authority:', '').trim();
            } else if (line.startsWith('Started On:')) {
              currentItem.startDate = line.replace('Started On:', '').trim();
            } else if (line.startsWith('Finished On:')) {
              currentItem.endDate = line.replace('Finished On:', '').trim();
            } else if (line.startsWith('License Number:')) {
              currentItem.licenseNumber = line.replace('License Number:', '').trim();
            }
          }
          break;
          
        // Add other cases as needed
      }
    }

    if (Object.keys(currentItem).length > 0) {
      data.push(currentItem);
    }

    return data;
  }

  deduplicateData(data) {
    return data.filter((item, index, self) =>
      index === self.findIndex(t => 
        JSON.stringify(t) === JSON.stringify(item)
      )
    );
  }

  formatResponse(type, data) {
    if (!data || data.length === 0) {
      return `No ${type} information found.`;
    }

    switch (type) {
      case 'certification':
        return this.formatCertifications(data);
      case 'education':
        return this.formatEducation(data);
      case 'work':
        return this.formatWorkExperience(data);
      default:
        return this.formatGeneral(data);
    }
  }

  formatCertifications(data) {
    // Sort by date (most recent first)
    data.sort((a, b) => {
      const dateA = a.endDate || a.startDate || '';
      const dateB = b.endDate || b.startDate || '';
      return new Date(dateB) - new Date(dateA);
    });

    let response = "Professional Certifications:\n\n";
    const groupedByAuthority = this.groupByAuthority(data);

    for (const [authority, certs] of Object.entries(groupedByAuthority)) {
      response += `${authority}:\n`;
      for (const cert of certs) {
        let certLine = `• ${cert.name}`;
        
        // Add dates if available
        if (cert.startDate || cert.endDate) {
          const dates = [];
          if (cert.startDate) dates.push(`Started: ${cert.startDate}`);
          if (cert.endDate) dates.push(`Completed: ${cert.endDate}`);
          certLine += ` (${dates.join(', ')})`;
        }
        
        // Add license if available
        if (cert.licenseNumber) {
          certLine += ` - License: ${cert.licenseNumber}`;
        }
        
        response += `${certLine}\n`;
      }
      response += '\n';
    }

    return response.trim();
  }

  groupByAuthority(certifications) {
    return certifications.reduce((groups, cert) => {
      const authority = cert.authority || 'Other';
      if (!groups[authority]) {
        groups[authority] = [];
      }
      groups[authority].push(cert);
      return groups;
    }, {});
  }

  createGeneralSummary(documents) {
    return documents
      .filter(doc => doc.text && doc.similarity > 0.5)
      .map(doc => doc.text.split('\n')
        .filter(line => 
          !line.startsWith('Creation Date:') && 
          !line.startsWith('Status:') &&
          !line.includes('----------------------------------------')
        ).join('\n')
      )
      .slice(0, 2)
      .join('\n\n');
  }
}

module.exports = { VectorizeClient };