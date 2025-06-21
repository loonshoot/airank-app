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
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    description: 'Compact and efficient GPT-4.1 model'
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
    provider: 'anthropic',
    description: 'Anthropic\'s most powerful model for complex reasoning'
  },
  {
    id: 'claude-sonnet-4@20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
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
    id: 'anthropic',
    name: 'Anthropic',
    logo: '/images/providers/anthropic.svg'
  },
  {
    id: 'google',
    name: 'Google',
    logo: '/images/providers/google.svg'
  }
];

export const getModelsByProvider = (providerId) => {
  return AVAILABLE_MODELS.filter(model => model.provider === providerId);
};

export const getModelById = (modelId) => {
  return AVAILABLE_MODELS.find(model => model.id === modelId);
}; 