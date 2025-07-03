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
  difficulty: "easy" | "medium" | "hard";
  features: string[];
  setup?: string;
  category: "local" | "cloud";
  requiresApiKey: boolean;
  isRecommended?: boolean;
}

// Cloud AI Providers
export const CLOUD_AI_PROVIDERS: Record<string, ModelEndpointConfig> = {
  openai: {
    name: "🤖 OpenAI",
    description: "Official OpenAI API with GPT models.",
    server: "OpenAI",
    defaultHost: "api.openai.com",
    defaultPort: "443",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: [
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4o",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-16k",
    ],
    documentation: "https://platform.openai.com/docs/api-reference",
    difficulty: "easy",
    features: [
      "High quality",
      "Fast responses",
      "Multiple models",
      "Function calling",
    ],
    setup: "Get API key from platform.openai.com",
    category: "cloud",
    requiresApiKey: true,
    isRecommended: true,
  },

  anthropic: {
    name: "🧠 Anthropic Claude",
    description: "Anthropic Claude API for advanced AI conversations.",
    server: "Anthropic",
    defaultHost: "api.anthropic.com",
    defaultPort: "443",
    defaultEndpoint: "/v1/messages",
    supportsStreaming: true,
    modelsSupported: [
      "claude-3-opus",
      "claude-3-sonnet",
      "claude-3-haiku",
      "claude-2.1",
      "claude-2",
    ],
    documentation: "https://docs.anthropic.com/claude/reference",
    difficulty: "easy",
    features: ["Long context", "Safety focused", "Code generation", "Analysis"],
    setup: "Get API key from console.anthropic.com",
    category: "cloud",
    requiresApiKey: true,
    isRecommended: true,
  },

  google: {
    name: "🔍 Google Gemini",
    description: "Google Gemini AI models via official API.",
    server: "Google",
    defaultHost: "generativelanguage.googleapis.com",
    defaultPort: "443",
    defaultEndpoint: "/v1beta/models/gemini-pro:generateContent",
    supportsStreaming: true,
    modelsSupported: ["gemini-pro", "gemini-pro-vision", "gemini-ultra"],
    documentation: "https://ai.google.dev/docs",
    difficulty: "medium",
    features: ["Multimodal", "Vision support", "Fast inference", "Free tier"],
    setup: "Get API key from makersuite.google.com",
    category: "cloud",
    requiresApiKey: true,
  },

  cohere: {
    name: "💫 Cohere",
    description: "Cohere API for enterprise language models.",
    server: "Cohere",
    defaultHost: "api.cohere.ai",
    defaultPort: "443",
    defaultEndpoint: "/v1/chat",
    supportsStreaming: true,
    modelsSupported: [
      "command-r-plus",
      "command-r",
      "command",
      "command-light",
    ],
    documentation: "https://docs.cohere.com/",
    difficulty: "medium",
    features: [
      "Enterprise focused",
      "RAG support",
      "Embeddings",
      "Multilingual",
    ],
    setup: "Get API key from dashboard.cohere.com",
    category: "cloud",
    requiresApiKey: true,
  },

  together: {
    name: "🤝 Together AI",
    description: "Together AI platform for open source models.",
    server: "Together",
    defaultHost: "api.together.xyz",
    defaultPort: "443",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: [
      "llama-2-70b",
      "mistral-7b",
      "codellama-34b",
      "mixtral-8x7b",
    ],
    documentation: "https://docs.together.ai/",
    difficulty: "medium",
    features: [
      "Open source models",
      "Fast inference",
      "Cost effective",
      "Scale",
    ],
    setup: "Get API key from api.together.xyz",
    category: "cloud",
    requiresApiKey: true,
  },

  huggingface: {
    name: "🤗 Hugging Face",
    description: "Hugging Face Inference API for open models.",
    server: "HuggingFace",
    defaultHost: "api-inference.huggingface.co",
    defaultPort: "443",
    defaultEndpoint: "/models",
    supportsStreaming: false,
    modelsSupported: [
      "microsoft/DialoGPT-large",
      "microsoft/DialoGPT-medium",
      "gpt2",
      "distilgpt2",
    ],
    documentation: "https://huggingface.co/docs/api-inference",
    difficulty: "medium",
    features: ["Open models", "Free tier", "Model hub", "Community"],
    setup: "Get token from huggingface.co/settings/tokens",
    category: "cloud",
    requiresApiKey: true,
  },

  groq: {
    name: "⚡ Groq",
    description: "Ultra-fast inference for open source models.",
    server: "Groq",
    defaultHost: "api.groq.com",
    defaultPort: "443",
    defaultEndpoint: "/openai/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: ["llama2-70b-4096", "mixtral-8x7b-32768", "gemma-7b-it"],
    documentation: "https://console.groq.com/docs",
    difficulty: "easy",
    features: ["Ultra fast", "Open models", "High throughput", "Low latency"],
    setup: "Get API key from console.groq.com",
    category: "cloud",
    requiresApiKey: true,
    isRecommended: true,
  },

  deepseek: {
    name: "🔍 DeepSeek",
    description: "DeepSeek API for code and chat models.",
    server: "DeepSeek",
    defaultHost: "api.deepseek.com",
    defaultPort: "443",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: ["deepseek-coder", "deepseek-chat"],
    documentation: "https://platform.deepseek.com/api-docs",
    difficulty: "medium",
    features: [
      "Code generation",
      "Math reasoning",
      "Cost effective",
      "High performance",
    ],
    setup: "Get API key from platform.deepseek.com",
    category: "cloud",
    requiresApiKey: true,
  },
};

export const LOCAL_AI_SERVERS: Record<string, ModelEndpointConfig> = {
  // Ollama - Most Popular Local AI Server
  ollama: {
    name: "🦙 Ollama",
    description: "Most popular local AI server. Easy to install and use.",
    server: "Ollama",
    defaultHost: "localhost",
    defaultPort: "11434",
    defaultEndpoint: "/api/generate",
    supportsStreaming: true,
    modelsSupported: [
      "llama2",
      "llama3",
      "mistral",
      "codellama",
      "vicuna",
      "alpaca",
      "orca-mini",
      "neural-chat",
      "starling-lm",
    ],
    documentation: "https://ollama.ai/docs",
    difficulty: "easy",
    features: [
      "Auto model download",
      "GPU acceleration",
      "Multiple model support",
      "Built-in model management",
    ],
    setup: "Download from ollama.ai and run: ollama pull llama2",
    category: "local",
    requiresApiKey: false,
    isRecommended: true,
  },

  // LocalAI - OpenAI Compatible
  localai: {
    name: "🏠 LocalAI",
    description: "OpenAI-compatible API for running local models.",
    server: "LocalAI",
    defaultHost: "localhost",
    defaultPort: "8080",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: [
      "llama",
      "gpt4all",
      "alpaca",
      "vicuna",
      "koala",
      "wizard",
      "orca",
    ],
    documentation: "https://localai.io/basics/getting_started/",
    difficulty: "medium",
    features: [
      "OpenAI compatible",
      "Multiple backends",
      "Image generation",
      "Audio support",
    ],
    setup: "Docker: docker run -p 8080:8080 quay.io/go-skynet/local-ai",
    category: "local",
    requiresApiKey: false,
  },

  // Text Generation WebUI (oobabooga)
  textgen_webui: {
    name: "📝 Text Generation WebUI",
    description: "Popular web interface for local language models (oobabooga).",
    server: "Text Generation WebUI",
    defaultHost: "localhost",
    defaultPort: "7860",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: [
      "llama2",
      "llama3",
      "mistral",
      "wizard",
      "alpaca",
      "vicuna",
      "pygmalion",
    ],
    documentation: "https://github.com/oobabooga/text-generation-webui",
    difficulty: "medium",
    features: [
      "Gradio interface",
      "Multiple loaders",
      "Fine-tuning support",
      "Character chat",
    ],
    setup: "Clone repo, install dependencies, run server.py --api",
    category: "local",
    requiresApiKey: false,
  },

  // LM Studio
  lmstudio: {
    name: "🖥️ LM Studio",
    description: "Desktop app for running local AI models with GUI.",
    server: "LM Studio",
    defaultHost: "localhost",
    defaultPort: "1234",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: [
      "llama2",
      "mistral",
      "code-llama",
      "vicuna",
      "orca",
      "wizard",
    ],
    documentation: "https://lmstudio.ai/",
    difficulty: "easy",
    features: [
      "Desktop GUI",
      "Model browser",
      "Hardware optimization",
      "OpenAI compatible API",
    ],
    setup: "Download LM Studio, browse and download models, start local server",
    category: "local",
    requiresApiKey: false,
    isRecommended: true,
  },

  // vLLM
  vllm: {
    name: "⚡ vLLM",
    description: "High-throughput serving for large language models.",
    server: "vLLM",
    defaultHost: "localhost",
    defaultPort: "8000",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: [
      "llama2",
      "llama3",
      "mistral",
      "vicuna",
      "chatglm",
      "qwen",
    ],
    documentation: "https://docs.vllm.ai/",
    difficulty: "hard",
    features: [
      "High throughput",
      "Batching",
      "GPU optimization",
      "Production ready",
    ],
    setup: "pip install vllm && python -m vllm.entrypoints.openai.api_server",
    category: "local",
    requiresApiKey: false,
  },

  // GPT4All
  gpt4all: {
    name: "🌐 GPT4All",
    description: "Cross-platform local AI with desktop app.",
    server: "GPT4All",
    defaultHost: "localhost",
    defaultPort: "4891",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: ["gpt4all-j", "orca-mini", "vicuna", "wizard", "mpt"],
    documentation: "https://gpt4all.io/",
    difficulty: "easy",
    features: [
      "Desktop app",
      "No internet required",
      "Model ecosystem",
      "Cross-platform",
    ],
    setup: "Download GPT4All desktop app or use Python bindings",
    category: "local",
    requiresApiKey: false,
  },

  // Kobold AI
  koboldai: {
    name: "🐍 KoboldAI",
    description: "AI writing assistant and text generation interface.",
    server: "KoboldAI",
    defaultHost: "localhost",
    defaultPort: "5000",
    defaultEndpoint: "/api/v1/generate",
    supportsStreaming: false,
    modelsSupported: ["gpt-neo", "gpt-j", "opt", "bloom", "fairseq"],
    documentation: "https://github.com/KoboldAI/KoboldAI-Client",
    difficulty: "medium",
    features: [
      "Story writing",
      "Creative text",
      "Adventure mode",
      "Memory system",
    ],
    setup: "Clone KoboldAI repo and run play.py",
    category: "local",
    requiresApiKey: false,
  },

  // Llama.cpp
  llamacpp: {
    name: "🔧 Llama.cpp",
    description: "Efficient C++ implementation of LLaMA models.",
    server: "Llama.cpp",
    defaultHost: "localhost",
    defaultPort: "8080",
    defaultEndpoint: "/completion",
    supportsStreaming: true,
    modelsSupported: ["llama", "alpaca", "vicuna", "orca", "wizard"],
    documentation: "https://github.com/ggerganov/llama.cpp",
    difficulty: "hard",
    features: [
      "C++ performance",
      "Low memory usage",
      "CPU inference",
      "GGML format",
    ],
    setup: "Compile llama.cpp and run: ./server -m model.bin",
    category: "local",
    requiresApiKey: false,
  },

  // FastChat
  fastchat: {
    name: "💬 FastChat",
    description: "Distributed multi-model serving system.",
    server: "FastChat",
    defaultHost: "localhost",
    defaultPort: "8000",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: ["vicuna", "chatglm", "t5", "koala", "alpaca"],
    documentation: "https://github.com/lm-sys/FastChat",
    difficulty: "hard",
    features: [
      "Multi-model serving",
      "Web interface",
      "Distributed inference",
      "Evaluation",
    ],
    setup: "pip install fschat && python -m fastchat.serve.controller",
    category: "local",
    requiresApiKey: false,
  },

  // Serge
  serge: {
    name: "🌊 Serge",
    description: "Self-hosted chat interface for local models.",
    server: "Serge",
    defaultHost: "localhost",
    defaultPort: "8008",
    defaultEndpoint: "/api/chat",
    supportsStreaming: true,
    modelsSupported: ["llama", "alpaca", "vicuna"],
    documentation: "https://github.com/serge-chat/serge",
    difficulty: "medium",
    features: [
      "Docker deployment",
      "Chat interface",
      "Model management",
      "User authentication",
    ],
    setup: "Docker: docker run -p 8008:8008 ghcr.io/serge-chat/serge",
    category: "local",
    requiresApiKey: false,
  },

  // Jan AI
  janai: {
    name: "📱 Jan AI",
    description: "Desktop app alternative to ChatGPT running locally.",
    server: "Jan AI",
    defaultHost: "localhost",
    defaultPort: "1337",
    defaultEndpoint: "/v1/chat/completions",
    supportsStreaming: true,
    modelsSupported: ["llama2", "mistral", "codellama", "tinyllama"],
    documentation: "https://jan.ai/",
    difficulty: "easy",
    features: [
      "Desktop app",
      "Cross-platform",
      "Model store",
      "Privacy focused",
    ],
    setup: "Download Jan AI desktop app from jan.ai",
    category: "local",
    requiresApiKey: false,
  },

  // Petals
  petals: {
    name: "🌸 Petals",
    description: "Distributed inference for large language models.",
    server: "Petals",
    defaultHost: "localhost",
    defaultPort: "8080",
    defaultEndpoint: "/api/v1/generate",
    supportsStreaming: true,
    modelsSupported: ["bloom", "llama2", "falcon"],
    documentation: "https://github.com/bigscience-workshop/petals",
    difficulty: "hard",
    features: [
      "Distributed inference",
      "Large model support",
      "P2P networking",
      "Collaborative",
    ],
    setup: "pip install petals && python -m petals.cli.run_server",
    category: "local",
    requiresApiKey: false,
  },

  // Candle
  candle: {
    name: "🕯️ Candle",
    description: "Rust-based ML framework with local inference.",
    server: "Candle",
    defaultHost: "localhost",
    defaultPort: "8080",
    defaultEndpoint: "/generate",
    supportsStreaming: false,
    modelsSupported: ["llama", "mistral", "phi"],
    documentation: "https://github.com/huggingface/candle",
    difficulty: "hard",
    features: ["Rust performance", "CUDA support", "WASM support", "Safety"],
    setup: "Cargo install candle-core && run examples",
    category: "local",
    requiresApiKey: false,
  },
};

// Combine all AI providers
export const ALL_AI_PROVIDERS: Record<string, ModelEndpointConfig> = {
  ...CLOUD_AI_PROVIDERS,
  ...LOCAL_AI_SERVERS,
};

// Model-specific endpoint configurations (updated to include cloud providers)
export const MODEL_ENDPOINTS: Record<string, string[]> = {
  // Cloud models
  "gpt-4": ["openai"],
  "gpt-4-turbo": ["openai"],
  "gpt-4o": ["openai"],
  "gpt-3.5-turbo": ["openai"],
  "claude-3-opus": ["anthropic"],
  "claude-3-sonnet": ["anthropic"],
  "claude-3-haiku": ["anthropic"],
  "gemini-pro": ["google"],
  "gemini-pro-vision": ["google"],

  // Llama models (local + cloud)
  llama2: [
    "ollama",
    "localai",
    "textgen_webui",
    "lmstudio",
    "vllm",
    "together",
  ],
  llama3: [
    "ollama",
    "localai",
    "textgen_webui",
    "lmstudio",
    "vllm",
    "together",
  ],
  "llama2:7b": ["ollama", "localai", "lmstudio"],
  "llama2:13b": ["ollama", "localai", "lmstudio", "vllm"],
  "llama2:70b": ["ollama", "vllm", "fastchat", "together"],

  // Code models
  codellama: ["ollama", "localai", "textgen_webui", "janai", "together"],
  "codellama:7b": ["ollama", "localai", "lmstudio"],
  "codellama:13b": ["ollama", "lmstudio", "vllm"],
  "codellama:34b": ["ollama", "vllm", "fastchat", "together"],

  // Mistral models
  mistral: [
    "ollama",
    "localai",
    "textgen_webui",
    "lmstudio",
    "vllm",
    "together",
  ],
  "mistral:7b": ["ollama", "localai", "lmstudio", "groq"],
  "mixtral:8x7b": ["ollama", "vllm", "fastchat", "together", "groq"],

  // Other popular models
  vicuna: ["ollama", "localai", "textgen_webui", "lmstudio", "fastchat"],
  alpaca: ["ollama", "localai", "textgen_webui", "llamacpp"],
  "orca-mini": ["ollama", "gpt4all", "textgen_webui"],
  wizard: ["localai", "textgen_webui", "llamacpp"],
  "neural-chat": ["ollama", "textgen_webui"],
  "starling-lm": ["ollama", "textgen_webui"],
  tinyllama: ["ollama", "janai"],
  phi: ["localai", "candle"],
  "gpt4all-j": ["gpt4all", "koboldai"],
};

// Get suggested endpoints for a model
export function getSuggestedEndpoints(
  modelName: string,
  category?: "local" | "cloud" | "all"
): string[] {
  const normalizedModel = modelName.toLowerCase();

  // Direct model match
  if (MODEL_ENDPOINTS[normalizedModel]) {
    let endpoints = MODEL_ENDPOINTS[normalizedModel];

    // Filter by category if specified
    if (category && category !== "all") {
      endpoints = endpoints.filter((serverKey) => {
        const config = ALL_AI_PROVIDERS[serverKey];
        return config && config.category === category;
      });
    }

    return endpoints;
  }

  // Partial model match
  for (const [model, endpoints] of Object.entries(MODEL_ENDPOINTS)) {
    if (normalizedModel.includes(model) || model.includes(normalizedModel)) {
      let filteredEndpoints = endpoints;

      // Filter by category if specified
      if (category && category !== "all") {
        filteredEndpoints = endpoints.filter((serverKey) => {
          const config = ALL_AI_PROVIDERS[serverKey];
          return config && config.category === category;
        });
      }

      return filteredEndpoints;
    }
  }

  // Default suggestions based on category
  if (category === "cloud") {
    return ["openai", "anthropic", "groq"];
  } else if (category === "local") {
    return ["ollama", "localai", "lmstudio"];
  }

  // Default suggestions for unknown models (mixed)
  return ["ollama", "localai", "lmstudio", "openai"];
}

// Get endpoint configuration by server name
export function getEndpointConfig(
  serverName: string
): ModelEndpointConfig | null {
  return ALL_AI_PROVIDERS[serverName] || null;
}

// Get all available servers sorted by difficulty and category
export function getAllServers(
  category?: "local" | "cloud" | "all"
): ModelEndpointConfig[] {
  let servers = Object.values(ALL_AI_PROVIDERS);

  // Filter by category if specified
  if (category && category !== "all") {
    servers = servers.filter((server) => server.category === category);
  }

  return servers.sort((a, b) => {
    // Sort by category first (cloud first, then local)
    if (a.category !== b.category) {
      return a.category === "cloud" ? -1 : 1;
    }

    // Then by recommendation status
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;

    // Finally by difficulty
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });
}

// Get popular/recommended servers
export function getRecommendedServers(
  category?: "local" | "cloud" | "all"
): ModelEndpointConfig[] {
  let servers = Object.values(ALL_AI_PROVIDERS).filter(
    (server) => server.isRecommended
  );

  // Filter by category if specified
  if (category && category !== "all") {
    servers = servers.filter((server) => server.category === category);
  }

  return servers;
}

// Format endpoint URL (updated for cloud providers)
export function formatEndpointUrl(
  host: string,
  port: string,
  endpoint: string,
  isHttps?: boolean
): string {
  const cleanHost = host || "localhost";
  const cleanPort = port || "8080";
  const cleanEndpoint = endpoint || "/";

  // Determine protocol
  const protocol =
    isHttps ||
    port === "443" ||
    host.includes(".com") ||
    host.includes(".ai") ||
    host.includes(".co")
      ? "https"
      : "http";

  // For cloud providers, don't include port if it's 443 (HTTPS default)
  const portPart =
    protocol === "https" && port === "443" ? "" : `:${cleanPort}`;

  return `${protocol}://${cleanHost}${portPart}${cleanEndpoint}`;
}

// Validate endpoint configuration
export function validateEndpoint(
  host: string,
  port: string,
  endpoint: string
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!host || host.trim() === "") {
    errors.push("Host is required");
  }

  if (!port || port.trim() === "") {
    errors.push("Port is required");
  } else {
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push("Port must be a valid number between 1 and 65535");
    }
  }

  if (!endpoint || endpoint.trim() === "") {
    errors.push("Endpoint path is required");
  } else if (!endpoint.startsWith("/")) {
    errors.push("Endpoint must start with /");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  LOCAL_AI_SERVERS,
  CLOUD_AI_PROVIDERS,
  ALL_AI_PROVIDERS,
  MODEL_ENDPOINTS,
  getSuggestedEndpoints,
  getEndpointConfig,
  getAllServers,
  getRecommendedServers,
  formatEndpointUrl,
  validateEndpoint,
};
