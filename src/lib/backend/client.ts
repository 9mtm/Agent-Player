/**
 * Backend API Client
 * Unified client for all backend API calls
 */

import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

/**
 * Base fetch function with error handling (uses external backend URL)
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;

  // Only add Content-Type header if there's a body
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (options.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

/**
 * Local fetch function for Next.js API routes
 */
async function fetchLocal<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (options.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Models API
// ============================================

export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
}

export const modelsAPI = {
  async list(): Promise<Model[]> {
    const data = await fetchAPI<{ models: Model[] }>('/api/models');
    return data.models;
  },

  async getProviders(): Promise<{ name: string; available: boolean }[]> {
    const data = await fetchAPI<{ providers: { name: string; available: boolean }[] }>(
      '/api/models/providers'
    );
    return data.providers;
  },
};

// ============================================
// Agents Config API
// ============================================

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  system_prompt: string;
  model: string;
  provider: string;
  isPrimary: boolean;
  temperature: number;
  max_tokens: number;
  capabilities: Record<string, any>;
  apiKeySet: boolean;
  created_at: string;
  updated_at: string;
}

export const agentsAPI = {
  async list(): Promise<AgentConfig[]> {
    const data = await fetchAPI<{ agents: AgentConfig[] }>('/api/agents');
    return data.agents;
  },

  async get(id: string): Promise<AgentConfig> {
    const data = await fetchAPI<{ agent: AgentConfig }>(`/api/agents/${id}`);
    return data.agent;
  },

  async create(input: Partial<AgentConfig> & { name: string }): Promise<AgentConfig> {
    const data = await fetchAPI<{ agent: AgentConfig }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.agent;
  },

  async update(id: string, input: Partial<AgentConfig>): Promise<AgentConfig> {
    const data = await fetchAPI<{ agent: AgentConfig }>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.agent;
  },

  async delete(id: string): Promise<boolean> {
    await fetchAPI(`/api/agents/${id}`, { method: 'DELETE' });
    return true;
  },

  async setPrimary(id: string): Promise<boolean> {
    await fetchAPI(`/api/agents/${id}/set-primary`, { method: 'POST' });
    return true;
  },

  async duplicate(id: string): Promise<AgentConfig> {
    const data = await fetchAPI<{ agent: AgentConfig }>(`/api/agents/${id}/duplicate`, {
      method: 'POST',
    });
    return data.agent;
  },
};

// ============================================
// Chat API
// ============================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  agentId?: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export const chatAPI = {
  async send(options: ChatOptions): Promise<{ message: Message; usage?: any }> {
    return fetchAPI('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ ...options, stream: false }),
    });
  },

  async *stream(options: ChatOptions): AsyncGenerator<string> {
    const url = `${BACKEND_URL}/api/chat`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...options, stream: true }),
    });

    if (!res.ok) {
      throw new Error(`Chat API Error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          if (json.content) {
            yield json.content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  },
};

// ============================================
// Sessions API
// ============================================

export interface Session {
  id: string;
  title: string | null;
  model: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  model: string | null;
  tokens: number | null;
  createdAt: string;
}

export const sessionsAPI = {
  async list(): Promise<Session[]> {
    const data = await fetchAPI<{ sessions: Session[] }>('/api/sessions');
    return data.sessions;
  },

  async create(input: { title?: string; model?: string; systemPrompt?: string } = {}): Promise<Session> {
    const data = await fetchAPI<{ session: Session }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.session;
  },

  async get(id: string): Promise<Session | null> {
    try {
      const data = await fetchAPI<{ session: Session }>(`/api/sessions/${id}`);
      return data.session;
    } catch {
      return null;
    }
  },

  async update(id: string, input: { title?: string; model?: string }): Promise<Session> {
    const data = await fetchAPI<{ session: Session }>(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.session;
  },

  async delete(id: string): Promise<boolean> {
    await fetchAPI(`/api/sessions/${id}`, { method: 'DELETE' });
    return true;
  },

  async getMessages(sessionId: string): Promise<SessionMessage[]> {
    const data = await fetchAPI<{ messages: SessionMessage[] }>(`/api/sessions/${sessionId}/messages`);
    return data.messages;
  },

  async addMessage(
    sessionId: string,
    input: { role: 'user' | 'assistant' | 'system'; content: string; model?: string }
  ): Promise<SessionMessage> {
    const data = await fetchAPI<{ message: SessionMessage }>(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.message;
  },

  async clearMessages(sessionId: string): Promise<void> {
    await fetchAPI(`/api/sessions/${sessionId}/messages`, { method: 'DELETE' });
  },
};

// ============================================
// Tools API
// ============================================

export interface Tool {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }>;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  output?: string;
  error?: string;
}

export const toolsAPI = {
  async list(): Promise<Tool[]> {
    const data = await fetchAPI<{ tools: Tool[] }>('/api/tools');
    return data.tools;
  },

  async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
    return fetchAPI(`/api/tools/${name}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async executeMany(
    calls: Array<{ tool: string; params: Record<string, any> }>
  ): Promise<ToolResult[]> {
    const data = await fetchAPI<{ results: ToolResult[] }>('/api/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ calls }),
    });
    return data.results;
  },
};

// ============================================
// Skills API (already exists, re-export)
// ============================================

export { skillsClient as skillsAPI } from '../skills/client';

// ============================================
// Channels/Extensions API
// ============================================

export interface ChannelConfig {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'secret';
    label?: string;
    description?: string;
    required?: boolean;
    default?: string | number | boolean;
    placeholder?: string;
  };
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  error?: string;
  config?: ChannelConfig;
}

export interface ChannelInfo {
  id: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectedAs?: string;
  connectedAt?: string;
  lastMessageAt?: string;
  error?: string;
}

export const channelsAPI = {
  async list(): Promise<Channel[]> {
    const data = await fetchAPI<{ channels: Channel[] }>('/api/channels');
    return data.channels;
  },

  async getStatus(): Promise<ChannelInfo[]> {
    const data = await fetchAPI<{ channels: ChannelInfo[] }>('/api/channels/status');
    return data.channels;
  },

  async getChannelStatus(id: string): Promise<ChannelInfo> {
    return fetchAPI<ChannelInfo>(`/api/channels/${id}/status`);
  },

  async connect(id: string, config?: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    return fetchAPI(`/api/channels/${id}/connect`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  },

  async disconnect(id: string): Promise<{ success: boolean; message: string }> {
    return fetchAPI(`/api/channels/${id}/disconnect`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async send(
    channelId: string,
    options: { to: string; text: string; replyToId?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return fetchAPI(`/api/channels/${channelId}/send`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
};

export interface SetupStep {
  title: string;
  description: string;
  link?: { url: string; label: string };
  image?: string;
}

export interface SetupGuide {
  title?: string;
  description?: string;
  videoUrl?: string; // YouTube embed URL
  steps: SetupStep[];
  tips?: string[];
  warnings?: string[];
}

export interface Extension {
  id: string;
  name: string;
  description?: string;
  type: 'channel' | 'app' | 'theme';
  version: string;
  author?: string;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  error?: string;
  config?: ChannelConfig;
  setupGuide?: SetupGuide;
}

export const extensionsAPI = {
  async list(): Promise<Extension[]> {
    // Use local Next.js API route
    const data = await fetchLocal<{ extensions: Extension[] }>('/api/extensions');
    return data.extensions;
  },

  async get(id: string): Promise<Extension> {
    return fetchLocal<Extension>(`/api/extensions/${id}`);
  },

  async enable(id: string, config?: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    return fetchLocal(`/api/extensions/${id}/enable`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  },

  async disable(id: string): Promise<{ success: boolean; message: string }> {
    return fetchLocal(`/api/extensions/${id}/disable`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};

// ============================================
// Gateway API (Multi-Interface)
// ============================================

export interface GatewayStatus {
  status: string;
  channels: string[];
  channelCount: number;
  running: boolean;
  config: {
    sessionTimeout: number;
    maxHistorySize: number;
    syncAcrossChannels: boolean;
    notifyAllChannels: boolean;
    storageDir: string;
  };
}

export interface GatewayChannel {
  id: string;
  name: string;
  connected: boolean;
}

export interface GatewaySession {
  sessionId: string;
  userId: string;
  activeChannels: string[];
  lastActiveChannel: string;
  conversationCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface GatewayMessage {
  role: 'user' | 'agent';
  content: string;
  channelId: string;
  timestamp: number;
}

export const gatewayAPI = {
  async getStatus(): Promise<GatewayStatus> {
    return fetchAPI('/api/gateway/status');
  },

  async getChannels(): Promise<GatewayChannel[]> {
    const data = await fetchAPI<{ channels: GatewayChannel[]; total: number }>(
      '/api/gateway/channels'
    );
    return data.channels;
  },

  async getSession(userId: string): Promise<GatewaySession> {
    const data = await fetchAPI<{ session: GatewaySession }>(
      `/api/gateway/sessions/${userId}`
    );
    return data.session;
  },

  async getHistory(userId: string, limit?: number): Promise<GatewayMessage[]> {
    const query = limit ? `?limit=${limit}` : '';
    const data = await fetchAPI<{ history: GatewayMessage[]; total: number }>(
      `/api/gateway/sessions/${userId}/history${query}`
    );
    return data.history;
  },

  async sendMessage(
    userId: string,
    message: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; sessionId: string }> {
    return fetchAPI('/api/gateway/message', {
      method: 'POST',
      body: JSON.stringify({ userId, message, sessionId, metadata }),
    });
  },
};

// ============================================
// Memory API (Semantic Memory)
// ============================================

export type MemoryType = 'fact' | 'preference' | 'conversation' | 'task';

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  importance: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export const memoryAPI = {
  async store(input: {
    userId: string;
    type: MemoryType;
    content: string;
    metadata?: Record<string, any>;
    importance?: number;
    expiresAt?: string;
  }): Promise<Memory> {
    const data = await fetchAPI<{ memory: Memory }>('/api/memory', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.memory;
  },

  async search(
    userId: string,
    query: string,
    options?: {
      type?: MemoryType;
      limit?: number;
      minScore?: number;
    }
  ): Promise<MemorySearchResult[]> {
    const data = await fetchAPI<{ results: MemorySearchResult[] }>('/api/memory/search', {
      method: 'POST',
      body: JSON.stringify({ userId, query, ...options }),
    });
    return data.results;
  },

  async list(
    userId: string,
    options?: {
      type?: MemoryType;
      limit?: number;
      offset?: number;
    }
  ): Promise<Memory[]> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchAPI<{ memories: Memory[] }>(`/api/memory/${userId}${query}`);
    return data.memories;
  },

  async get(id: string): Promise<Memory | null> {
    try {
      const data = await fetchAPI<{ memory: Memory }>(`/api/memory/${id}`);
      return data.memory;
    } catch {
      return null;
    }
  },

  async update(
    id: string,
    input: {
      content?: string;
      metadata?: Record<string, any>;
      importance?: number;
    }
  ): Promise<Memory> {
    const data = await fetchAPI<{ memory: Memory }>(`/api/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.memory;
  },

  async delete(id: string): Promise<boolean> {
    await fetchAPI(`/api/memory/${id}`, { method: 'DELETE' });
    return true;
  },

  async extractFromText(
    userId: string,
    text: string
  ): Promise<Memory[]> {
    const data = await fetchAPI<{ memories: Memory[] }>('/api/memory/extract', {
      method: 'POST',
      body: JSON.stringify({ userId, text }),
    });
    return data.memories;
  },
};

// ============================================
// Credentials API (Encrypted Secrets)
// ============================================

export type CredentialType = 'api_key' | 'oauth_token' | 'password' | 'secret';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialWithValue extends Credential {
  value: string;
}

export const credentialsAPI = {
  async list(): Promise<Credential[]> {
    const data = await fetchAPI<{ credentials: Credential[] }>('/api/credentials');
    return data.credentials;
  },

  async get(id: string, decrypt: boolean = false): Promise<CredentialWithValue | Credential> {
    const query = decrypt ? '?decrypt=true' : '';
    const data = await fetchAPI<{ credential: CredentialWithValue | Credential }>(
      `/api/credentials/${id}${query}`
    );
    return data.credential;
  },

  async create(input: {
    name: string;
    type: CredentialType;
    value: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<Credential> {
    const data = await fetchAPI<{ credential: Credential }>('/api/credentials', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.credential;
  },

  async update(
    id: string,
    input: {
      name?: string;
      value?: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Credential> {
    const data = await fetchAPI<{ credential: Credential }>(`/api/credentials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.credential;
  },

  async delete(id: string): Promise<boolean> {
    await fetchAPI(`/api/credentials/${id}`, { method: 'DELETE' });
    return true;
  },

  async export(password: string): Promise<{ data: string }> {
    return fetchAPI('/api/credentials/export', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async import(data: string, password: string): Promise<{ imported: number }> {
    return fetchAPI('/api/credentials/import', {
      method: 'POST',
      body: JSON.stringify({ data, password }),
    });
  },
};

// ============================================
// Scheduler API (Cron Jobs)
// ============================================

export type JobActionType = 'skill' | 'webhook' | 'script' | 'message';

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  enabled: boolean;
  actionType: JobActionType;
  actionData: Record<string, any>;
  notifyChannel?: string;
  notifyTarget?: string;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobExecution {
  id: string;
  jobId: string;
  success: boolean;
  output?: string;
  error?: string;
  executedAt: string;
  duration: number;
}

export const schedulerAPI = {
  async listJobs(): Promise<CronJob[]> {
    const data = await fetchAPI<{ jobs: CronJob[] }>('/api/scheduler/jobs');
    return data.jobs;
  },

  async getJob(id: string): Promise<CronJob> {
    const data = await fetchAPI<{ job: CronJob }>(`/api/scheduler/jobs/${id}`);
    return data.job;
  },

  async createJob(input: {
    name: string;
    cronExpression: string;
    actionType: JobActionType;
    actionData: Record<string, any>;
    description?: string;
    enabled?: boolean;
    notifyChannel?: string;
    notifyTarget?: string;
  }): Promise<CronJob> {
    const data = await fetchAPI<{ job: CronJob }>('/api/scheduler/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.job;
  },

  async updateJob(
    id: string,
    input: {
      name?: string;
      cronExpression?: string;
      actionType?: JobActionType;
      actionData?: Record<string, any>;
      description?: string;
      enabled?: boolean;
      notifyChannel?: string;
      notifyTarget?: string;
    }
  ): Promise<CronJob> {
    const data = await fetchAPI<{ job: CronJob }>(`/api/scheduler/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.job;
  },

  async deleteJob(id: string): Promise<boolean> {
    await fetchAPI(`/api/scheduler/jobs/${id}`, { method: 'DELETE' });
    return true;
  },

  async runJob(id: string): Promise<JobExecution> {
    const data = await fetchAPI<{ execution: JobExecution }>(
      `/api/scheduler/jobs/${id}/run`,
      { method: 'POST' }
    );
    return data.execution;
  },

  async getExecutions(jobId: string, limit?: number): Promise<JobExecution[]> {
    const query = limit ? `?limit=${limit}` : '';
    const data = await fetchAPI<{ executions: JobExecution[] }>(
      `/api/scheduler/jobs/${jobId}/executions${query}`
    );
    return data.executions;
  },

  async enableJob(id: string): Promise<boolean> {
    await fetchAPI(`/api/scheduler/jobs/${id}/enable`, { method: 'POST' });
    return true;
  },

  async disableJob(id: string): Promise<boolean> {
    await fetchAPI(`/api/scheduler/jobs/${id}/disable`, { method: 'POST' });
    return true;
  },
};

// ============================================
// Onboarding API (Setup Wizard)
// ============================================

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  totalSteps: number;
  data: {
    userName?: string;
    language?: string;
    aiProvider?: string;
    aiModel?: string;
    selectedChannels?: string[];
    selectedSkills?: string[];
  };
}

export const onboardingAPI = {
  async getState(): Promise<OnboardingState> {
    const data = await fetchAPI<{ state: OnboardingState }>('/api/onboarding');
    return data.state;
  },

  async updateState(input: Partial<OnboardingState['data']>): Promise<OnboardingState> {
    const data = await fetchAPI<{ state: OnboardingState }>('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.state;
  },

  async complete(): Promise<boolean> {
    await fetchAPI('/api/onboarding/complete', { method: 'POST' });
    return true;
  },

  async reset(): Promise<boolean> {
    await fetchAPI('/api/onboarding/reset', { method: 'POST' });
    return true;
  },
};

// ============================================
// Health Check
// ============================================

export const healthAPI = {
  async check(): Promise<{ status: string; timestamp: string; version: string }> {
    return fetchAPI('/health');
  },

  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.check();
      return true;
    } catch {
      return false;
    }
  },
};
