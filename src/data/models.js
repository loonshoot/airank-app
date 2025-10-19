export const AVAILABLE_MODELS = [
  // BASIC TIER - Available in all plans
  {
    id: 'gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and efficient mini model for everyday tasks',
    tier: 'Basic'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'google',
    description: 'Fast and cost-effective Claude model',
    tier: 'Basic'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Fast and efficient Gemini model',
    tier: 'Basic'
  },

  // PROFESSIONAL TIER - Available in Small, Medium, Enterprise
  {
    id: 'gpt-4o-2024-08-06',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable GPT-4 model with multimodal capabilities',
    tier: 'Professional'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'google',
    description: 'Balanced Claude model for most use cases',
    tier: 'Professional'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s most capable model',
    tier: 'Professional'
  },

  // PREMIUM TIER (Medium) - Available in Medium, Enterprise
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'Latest GPT-4 with enhanced capabilities',
    tier: 'Premium',
    warning: 'Very expensive - limit to 1 per Medium plan'
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'google',
    description: 'Latest Claude Haiku model',
    tier: 'Premium'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'google',
    description: 'Most powerful Claude model for complex reasoning',
    tier: 'Premium',
    warning: 'Expensive - limit to 1 per Medium plan'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    description: 'Lightweight Gemini model for quick tasks',
    tier: 'Premium'
  },

  // PREMIUM TIER (Enterprise Only)
  {
    id: 'gpt-4-turbo-2024-04-09',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Optimized GPT-4 model for complex tasks',
    tier: 'Premium'
  },
  {
    id: 'gpt-4.1-mini-2025-04-14',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    description: 'Efficient GPT-4.1 for faster responses',
    tier: 'Premium'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Latest Gemini Flash model',
    tier: 'Premium'
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
