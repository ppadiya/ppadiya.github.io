// api/optimize-prompt.js
// Example for Vercel/Netlify Functions (adjust handler export if needed for other providers like AWS Lambda)

import Groq from 'groq-sdk';

// Ensure you have GROQ_API_KEY set in your environment variables
const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.error("FATAL: GROQ_API_KEY environment variable is not set.");
  // In a real scenario, you might want the function to return an error immediately
}

const groq = new Groq({ apiKey: groqApiKey });

// Define the handler function based on the serverless provider
// Vercel/Next.js API Routes export a default function
export default async function handler(req, res) {
  // Allow requests from your specific frontend origin in production
  // For development, you might allow '*' or 'http://localhost:xxxx'
  // IMPORTANT: Restrict this in production for security!
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  if (!groqApiKey) {
    res.status(500).json({ error: 'Server configuration error: API key not set.' });
    return;
  }

  const { prompt: originalPrompt, model = 'llama3-8b-8192' } = req.body; // Default model, adjust if needed

  if (!originalPrompt) {
    res.status(400).json({ error: 'Missing required field: prompt' });
    return;
  }

  try {
    console.log(`Received prompt for optimization. Model: ${model}`);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert prompt optimizer. Enhance the user\'s prompt to be clearer, more specific, and more effective for large language models. Return only the optimized prompt text, without any preamble or explanation.'
        },
        {
          role: 'user',
          content: originalPrompt,
        },
      ],
      model: model, // e.g., 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'
      temperature: 0.5, // Adjust creativity vs. determinism
      max_tokens: 1024, // Adjust response length limit
      top_p: 1,
      stop: null,
      stream: false,
    });

    const optimizedPrompt = chatCompletion.choices[0]?.message?.content || '';

    if (!optimizedPrompt) {
      console.error("Groq API returned empty content.");
      res.status(500).json({ error: 'Failed to optimize prompt: Empty response from API.' });
      return;
    }

    console.log("Optimization successful.");
    res.status(200).json({ optimizedPrompt: optimizedPrompt.trim() });

  } catch (error) {
    console.error('Error calling Groq API:', error);
    // Avoid sending detailed internal errors to the client
    let errorMessage = 'Failed to optimize prompt due to an internal server error.';
    if (error.response) { // Check if it's an error from the Groq API itself
        console.error('Groq API Error Status:', error.response.status);
        console.error('Groq API Error Body:', error.response.data);
        errorMessage = `Failed to optimize prompt. API Error: ${error.response.statusText || error.response.status}`;
    } else if (error.request) { // Request made but no response received
        console.error('Groq API No Response:', error.request);
        errorMessage = 'Failed to optimize prompt: No response from API server.';
    } else { // Setup error or other issue
        console.error('Groq API Request Setup Error:', error.message);
    }
    res.status(500).json({ error: errorMessage });
  }
}