const axios = require('axios');

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

    // Use a different Groq model that exists
    const groqData = {
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant who enhances prompts. Make the prompt more detailed, specific, and effective." 
        },
        { 
          role: "user", 
          content: `Enhance this prompt to make it more effective: ${prompt}` 
        }
      ],
      model: "llama-3.3-70b-versatile", // Changed model name
      temperature: 0.7,
      max_tokens: 1024
    };

    // Make the API call to Groq
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', groqData, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
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
    // Don't log the full error object
    optimizedPromptOutput.innerHTML = `<span class="error-message">Error: Could not optimize prompt. Please try again later.</span>`;
}
};