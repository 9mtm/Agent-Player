// Local AI Model Endpoints Configuration
// Based on research of popular local AI servers and their standard configurations

export interface ModelEndpointConfig {
  name: string;
  description: string;
  server: string;
  defaultHost: string;
  defaultPort: string;
  defaultEndpoint: string;
  supportsStreaming: boolean;
  modelsSupported: string[];
  documentation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  features: string[];
  setup?: string;
}

export const LOCAL_AI_SERVERS: Record<string, ModelEndpointConfig> = {
  // Ollama - Most Popular Local AI Server
  ollama: {
    name: '🦙 Ollama',
    description: 'Most popular local AI server. Easy to install and use.',
    server: 'Ollama',
    defaultHost: 'localhost',
    defaultPort: '11434',
    defaultEndpoint: '/api/generate',
    supportsStreaming: true,
    modelsSupported: ['llama2', 'llama3', 'mistral', 'codellama', 'vicuna', 'alpaca', 'orca-mini', 'neural-chat', 'starling-lm'],
    documentation: 'https://ollama.ai/docs',
    difficulty: 'easy',
    features: ['Auto model download', 'GPU acceleration', 'Multiple model support', 'Built-in model management'],
    setup: 'Download from ollama.ai and run: ollama pull llama2'
  },

  // LocalAI - OpenAI Compatible
  localai: {
    name: '🏠 LocalAI',
    description: 'OpenAI-compatible API for running local models.',
    server: 'LocalAI',
    defaultHost: 'localhost',
    defaultPort: '8080',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['llama', 'gpt4all', 'alpaca', 'vicuna', 'koala', 'wizard', 'orca'],
    documentation: 'https://localai.io/basics/getting_started/',
    difficulty: 'medium',
    features: ['OpenAI compatible', 'Multiple backends', 'Image generation', 'Audio support'],
    setup: 'Docker: docker run -p 8080:8080 quay.io/go-skynet/local-ai'
  },

  // Text Generation WebUI (oobabooga)
  textgen_webui: {
    name: '📝 Text Generation WebUI',
    description: 'Popular web interface for local language models (oobabooga).',
    server: 'Text Generation WebUI',
    defaultHost: 'localhost',
    defaultPort: '7860',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['llama2', 'llama3', 'mistral', 'wizard', 'alpaca', 'vicuna', 'pygmalion'],
    documentation: 'https://github.com/oobabooga/text-generation-webui',
    difficulty: 'medium',
    features: ['Gradio interface', 'Multiple loaders', 'Fine-tuning support', 'Character chat'],
    setup: 'Clone repo, install dependencies, run server.py --api'
  },

  // LM Studio
  lmstudio: {
    name: '🖥️ LM Studio',
    description: 'Desktop app for running local AI models with GUI.',
    server: 'LM Studio',
    defaultHost: 'localhost',
    defaultPort: '1234',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['llama2', 'mistral', 'code-llama', 'vicuna', 'orca', 'wizard'],
    documentation: 'https://lmstudio.ai/',
    difficulty: 'easy',
    features: ['Desktop GUI', 'Model browser', 'Hardware optimization', 'OpenAI compatible API'],
    setup: 'Download LM Studio, browse and download models, start local server'
  },

  // vLLM
  vllm: {
    name: '⚡ vLLM',
    description: 'High-throughput serving for large language models.',
    server: 'vLLM',
    defaultHost: 'localhost',
    defaultPort: '8000',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['llama2', 'llama3', 'mistral', 'vicuna', 'chatglm', 'qwen'],
    documentation: 'https://docs.vllm.ai/',
    difficulty: 'hard',
    features: ['High throughput', 'Batching', 'GPU optimization', 'Production ready'],
    setup: 'pip install vllm && python -m vllm.entrypoints.openai.api_server'
  },

  // GPT4All
  gpt4all: {
    name: '🌐 GPT4All',
    description: 'Cross-platform local AI with desktop app.',
    server: 'GPT4All',
    defaultHost: 'localhost',
    defaultPort: '4891',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['gpt4all-j', 'orca-mini', 'vicuna', 'wizard', 'mpt'],
    documentation: 'https://gpt4all.io/',
    difficulty: 'easy',
    features: ['Desktop app', 'No internet required', 'Model ecosystem', 'Cross-platform'],
    setup: 'Download GPT4All desktop app or use Python bindings'
  },

  // Kobold AI
  koboldai: {
    name: '🐍 KoboldAI',
    description: 'AI writing assistant and text generation interface.',
    server: 'KoboldAI',
    defaultHost: 'localhost',
    defaultPort: '5000',
    defaultEndpoint: '/api/v1/generate',
    supportsStreaming: false,
    modelsSupported: ['gpt-neo', 'gpt-j', 'opt', 'bloom', 'fairseq'],
    documentation: 'https://github.com/KoboldAI/KoboldAI-Client',
    difficulty: 'medium',
    features: ['Story writing', 'Creative text', 'Adventure mode', 'Memory system'],
    setup: 'Clone KoboldAI repo and run play.py'
  },

  // Llama.cpp
  llamacpp: {
    name: '🔧 Llama.cpp',
    description: 'Efficient C++ implementation of LLaMA models.',
    server: 'Llama.cpp',
    defaultHost: 'localhost',
    defaultPort: '8080',
    defaultEndpoint: '/completion',
    supportsStreaming: true,
    modelsSupported: ['llama', 'alpaca', 'vicuna', 'orca', 'wizard'],
    documentation: 'https://github.com/ggerganov/llama.cpp',
    difficulty: 'hard',
    features: ['C++ performance', 'Low memory usage', 'CPU inference', 'GGML format'],
    setup: 'Compile llama.cpp and run: ./server -m model.bin'
  },

  // FastChat
  fastchat: {
    name: '💬 FastChat',
    description: 'Distributed multi-model serving system.',
    server: 'FastChat',
    defaultHost: 'localhost',
    defaultPort: '8000',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['vicuna', 'chatglm', 't5', 'koala', 'alpaca'],
    documentation: 'https://github.com/lm-sys/FastChat',
    difficulty: 'hard',
    features: ['Multi-model serving', 'Web interface', 'Distributed inference', 'Evaluation'],
    setup: 'pip install fschat && python -m fastchat.serve.controller'
  },

  // Serge
  serge: {
    name: '🌊 Serge',
    description: 'Self-hosted chat interface for local models.',
    server: 'Serge',
    defaultHost: 'localhost',
    defaultPort: '8008',
    defaultEndpoint: '/api/chat',
    supportsStreaming: true,
    modelsSupported: ['llama', 'alpaca', 'vicuna'],
    documentation: 'https://github.com/serge-chat/serge',
    difficulty: 'medium',
    features: ['Docker deployment', 'Chat interface', 'Model management', 'User authentication'],
    setup: 'Docker: docker run -p 8008:8008 ghcr.io/serge-chat/serge'
  },

  // Jan AI
  janai: {
    name: '📱 Jan AI',
    description: 'Desktop app alternative to ChatGPT running locally.',
    server: 'Jan AI',
    defaultHost: 'localhost',
    defaultPort: '1337',
    defaultEndpoint: '/v1/chat/completions',
    supportsStreaming: true,
    modelsSupported: ['llama2', 'mistral', 'codellama', 'tinyllama'],
    documentation: 'https://jan.ai/',
    difficulty: 'easy',
    features: ['Desktop app', 'Cross-platform', 'Model store', 'Privacy focused'],
    setup: 'Download Jan AI desktop app from jan.ai'
  },

  // Petals
  petals: {
    name: '🌸 Petals',
    description: 'Distributed inference for large language models.',
    server: 'Petals',
    defaultHost: 'localhost',
    defaultPort: '8080',
    defaultEndpoint: '/api/v1/generate',
    supportsStreaming: true,
    modelsSupported: ['bloom', 'llama2', 'falcon'],
    documentation: 'https://github.com/bigscience-workshop/petals',
    difficulty: 'hard',
    features: ['Distributed inference', 'Large model support', 'P2P networking', 'Collaborative'],
    setup: 'pip install petals && python -m petals.cli.run_server'
  },

  // Candle
  candle: {
    name: '🕯️ Candle',
    description: 'Rust-based ML framework with local inference.',
    server: 'Candle',
    defaultHost: 'localhost',
    defaultPort: '8080',
    defaultEndpoint: '/generate',
    supportsStreaming: false,
    modelsSupported: ['llama', 'mistral', 'phi'],
    documentation: 'https://github.com/huggingface/candle',
    difficulty: 'hard',
    features: ['Rust performance', 'CUDA support', 'WASM support', 'Safety'],
    setup: 'Cargo install candle-core && run examples'
  }
};

// Model-specific endpoint configurations
export const MODEL_ENDPOINTS: Record<string, string[]> = {
  // Llama models
  'llama2': ['ollama', 'localai', 'textgen_webui', 'lmstudio', 'vllm'],
  'llama3': ['ollama', 'localai', 'textgen_webui', 'lmstudio', 'vllm'],
  'llama2:7b': ['ollama', 'localai', 'lmstudio'],
  'llama2:13b': ['ollama', 'localai', 'lmstudio', 'vllm'],
  'llama2:70b': ['ollama', 'vllm', 'fastchat'],
  
  // Code models
  'codellama': ['ollama', 'localai', 'textgen_webui', 'janai'],
  'codellama:7b': ['ollama', 'localai', 'lmstudio'],
  'codellama:13b': ['ollama', 'lmstudio', 'vllm'],
  'codellama:34b': ['ollama', 'vllm', 'fastchat'],
  
  // Mistral models
  'mistral': ['ollama', 'localai', 'textgen_webui', 'lmstudio', 'vllm'],
  'mistral:7b': ['ollama', 'localai', 'lmstudio'],
  'mixtral:8x7b': ['ollama', 'vllm', 'fastchat'],
  
  // Other popular models
  'vicuna': ['ollama', 'localai', 'textgen_webui', 'lmstudio', 'fastchat'],
  'alpaca': ['ollama', 'localai', 'textgen_webui', 'llamacpp'],
  'orca-mini': ['ollama', 'gpt4all', 'textgen_webui'],
  'wizard': ['localai', 'textgen_webui', 'llamacpp'],
  'neural-chat': ['ollama', 'textgen_webui'],
  'starling-lm': ['ollama', 'textgen_webui'],
  'tinyllama': ['ollama', 'janai'],
  'phi': ['localai', 'candle'],
  'gpt4all-j': ['gpt4all', 'koboldai']
};

// Get suggested endpoints for a model
export function getSuggestedEndpoints(modelName: string): string[] {
  const normalizedModel = modelName.toLowerCase();
  
  // Direct model match
  if (MODEL_ENDPOINTS[normalizedModel]) {
    return MODEL_ENDPOINTS[normalizedModel];
  }
  
  // Partial model match
  for (const [model, endpoints] of Object.entries(MODEL_ENDPOINTS)) {
    if (normalizedModel.includes(model) || model.includes(normalizedModel)) {
      return endpoints;
    }
  }
  
  // Default suggestions for unknown models
  return ['ollama', 'localai', 'lmstudio'];
}

// Get endpoint configuration by server name
export function getEndpointConfig(serverName: string): ModelEndpointConfig | null {
  return LOCAL_AI_SERVERS[serverName] || null;
}

// Get all available servers sorted by difficulty
export function getAllServers(): ModelEndpointConfig[] {
  const servers = Object.values(LOCAL_AI_SERVERS);
  return servers.sort((a, b) => {
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });
}

// Get popular/recommended servers
export function getRecommendedServers(): ModelEndpointConfig[] {
  const recommended = ['ollama', 'localai', 'lmstudio', 'textgen_webui'];
  return recommended.map(name => LOCAL_AI_SERVERS[name]).filter(Boolean);
}

// Format endpoint URL
export function formatEndpointUrl(host: string, port: string, endpoint: string): string {
  const cleanHost = host || 'localhost';
  const cleanPort = port || '8080';
  const cleanEndpoint = endpoint || '/';
  
  return `http://${cleanHost}:${cleanPort}${cleanEndpoint}`;
}

// Validate endpoint configuration
export function validateEndpoint(host: string, port: string, endpoint: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!host || host.trim() === '') {
    errors.push('Host is required');
  }
  
  if (!port || port.trim() === '') {
    errors.push('Port is required');
  } else {
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push('Port must be a valid number between 1 and 65535');
    }
  }
  
  if (!endpoint || endpoint.trim() === '') {
    errors.push('Endpoint path is required');
  } else if (!endpoint.startsWith('/')) {
    errors.push('Endpoint must start with /');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  LOCAL_AI_SERVERS,
  MODEL_ENDPOINTS,
  getSuggestedEndpoints,
  getEndpointConfig,
  getAllServers,
  getRecommendedServers,
  formatEndpointUrl,
  validateEndpoint
}; 