export const AVAILABLE_MODELS = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'OpenAI\'s most capable model for complex tasks'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable GPT-4 model with multimodal capabilities'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Optimized GPT-4 model for speed and efficiency'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s latest and most capable model'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Fast and efficient Gemini 2.5 model'
  },
  {
    id: 'claude-opus-4@20250514',
    name: 'Claude Opus 4',
    provider: 'google', // Via Vertex AI
    description: 'Anthropic\'s most powerful model for complex reasoning'
  },
  {
    id: 'claude-sonnet-4@20250514',
    name: 'Claude Sonnet 4',
    provider: 'google', // Via Vertex AI
    description: 'Balanced Claude 4 model for most use cases'
  }
];

export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '/images/providers/openai.svg'
  },
  {
    id: 'google',
    name: 'Google Vertex AI',
    logo: '/images/providers/google.svg'
  }
];

export const getModelsByProvider = (providerId) => {
  return AVAILABLE_MODELS.filter(model => model.provider === providerId);
};

export const getModelById = (modelId) => {
  return AVAILABLE_MODELS.find(model => model.id === modelId);
};

// Check if a model is historic (not in current AVAILABLE_MODELS)
export const isModelHistoric = (modelId) => {
  return !AVAILABLE_MODELS.find(model => model.id === modelId);
}; 