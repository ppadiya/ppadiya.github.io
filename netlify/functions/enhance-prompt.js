const axios = require('axios');

// Configuration
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const SITE_URL = process.env.URL || 'http://localhost:8888';
const SITE_NAME = 'Pratik Padiya Portfolio';
const OPENROUTER_MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';
const MODEL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_MODELS = [
  'deepseek/deepseek-chat:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free'
];

let modelCache = { models: null, fetchedAt: 0 };

async function getFreeModels() {
  if (modelCache.models && (Date.now() - modelCache.fetchedAt) < MODEL_CACHE_TTL) {
    return modelCache.models;
  }
  try {
    const res = await axios.get(OPENROUTER_MODELS_ENDPOINT, { timeout: 5000 });
    const free = res.data.data.filter(m => m.id.endsWith(':free')).map(m => m.id);
    if (free.length > 0) {
      modelCache = { models: free, fetchedAt: Date.now() };
      return free;
    }
  } catch (err) {
    console.error('Failed to fetch model list, using fallback:', err.message);
  }
  return FALLBACK_MODELS;
}

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming request body
    const { prompt, model } = JSON.parse(event.body);
    const selectedModel = model || DEFAULT_MODEL;
    
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    if (prompt.length > 2000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt too long. Maximum 2000 characters.' })
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

    const messages = [
      {
        role: "system",
        content: "You are an expert prompt optimizer. Enhance the user's prompt to be clearer, more specific, and more effective for large language models. Return only the optimized prompt text, without any preamble or explanation."
      },
      {
        role: "user",
        content: `Enhance this prompt to make it more effective: ${prompt}`
      }
    ];
    const headers = {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME
    };

    // Try the requested model first, then the live free-model list.
    // Free models are flaky (429/503/removed), so skip to the next on failure.
    const candidates = [selectedModel, ...(await getFreeModels()).filter(m => m !== selectedModel)];
    const deadline = Date.now() + 24000; // function timeout is 30s

    for (const candidate of candidates) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) break;
      try {
        const response = await axios.post(
          OPENROUTER_API_ENDPOINT,
          { model: candidate, messages, temperature: 0.3 },
          { headers, timeout: Math.min(8000, remaining) }
        );
        const optimized = response.data.choices?.[0]?.message?.content;
        if (!optimized || !optimized.trim()) {
          console.error(`Model ${candidate} returned empty content, trying next.`);
          continue;
        }
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optimizedPrompt: optimized })
        };
      } catch (error) {
        const status = error.response?.status;
        const upstreamCode = error.response?.data?.error?.code;
        console.error(`Model ${candidate} failed: status ${status}, code ${upstreamCode}`);
        const retryable = !error.response
          || status === 404 || status === 429 || status >= 500
          || upstreamCode === 429 || upstreamCode >= 500;
        if (!retryable) break;
      }
    }

    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'All AI models are currently unavailable. Please try again later.' })
    };
  } catch (error) {
    console.error("Error optimizing prompt:", error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not optimize prompt. Please try again later.' })
    };
  }
};
