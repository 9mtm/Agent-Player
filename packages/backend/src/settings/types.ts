/**
 * Settings Types
 */

export interface AgentSettings {
  // AI Provider
  provider: 'local' | 'claude' | 'openai';

  // Local (Ollama)
  local?: {
    url: string;
    model: string;
  };

  // Claude API
  claude?: {
    apiKey: string;
    model: 'claude-opus-4-6' | 'claude-sonnet-4-5-20250929' | 'claude-haiku-4-5-20251001';
    maxTokens?: number;
  };

  // OpenAI API
  openai?: {
    apiKey: string;
    model: string;
    maxTokens?: number;
  };

  // General
  temperature?: number;
  enableTools?: boolean;
  enableSkills?: boolean;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  provider: 'local',
  local: {
    url: 'http://localhost:11434',
    model: 'qwen2.5:latest',
  },
  temperature: 0.7,
  enableTools: true,
  enableSkills: true,
};
