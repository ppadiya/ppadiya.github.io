const axios = require('axios');

// Configuration
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming request body
    const { prompt } = JSON.parse(event.body);
    
    if (!prompt) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Check for API key
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenRouter API Key is not configured. Check environment variables.' })
      };
    }

    // Prepare the request data
    const requestData = {
      model: OPENROUTER_MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are an expert prompt optimizer. Enhance the user's prompt to be clearer, more specific, and more effective for large language models. Return only the optimized prompt text, without any preamble or explanation."
        },
        { 
          role: "user", 
          content: `Enhance this prompt to make it more effective: ${prompt}` 
        }
      ],
      temperature: 0.3
    };

    // Make the API call to OpenRouter
    const response = await axios.post(OPENROUTER_API_ENDPOINT, requestData, {
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
      },
      timeout: 8000 // 8 second timeout
    });

    // Return the enhanced prompt
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        optimizedPrompt: response.data.choices[0].message.content
      })
    };
  } catch (error) {
    console.error("Error optimizing prompt:", error.message);
    
    let errorMessage = 'Could not optimize prompt. Please try again later.';
    if (error.response) {
      // Log OpenRouter API error details
      console.error('OpenRouter API Error:', error.response.data);
      errorMessage = `API Error: ${error.response.status} - ${error.response.data.error || error.message}`;
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: errorMessage,
        details: error.message
      })
    };
  }
};