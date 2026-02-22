/**
 * Chat API Routes
 * Handles chat completions with streaming support
 * Uses primary agent from agents_config table
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { handleError } from '../error-handler.js';
import { AgentRuntime, type Message, type Skill } from '../../agent/index.js';
import { getSettingsManager } from '../../settings/index.js';
import { getDatabase } from '../../db/index.js';
import { streamChatClaude } from './chat-claude.js';
import { createToolsRegistry } from '../../tools/index.js';
import { geminiCliTool } from '../../tools/cli/gemini-cli.js';
import { claudeCliTool } from '../../tools/cli/claude-cli.js';
import { getJsonRenderPrompt } from './json-render-prompt.js';
import { readPersonality, readMemory } from '../../services/agent-files.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'qwen2.5:7b';

interface AgentConfig {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  provider: string;
  is_primary: number;
  temperature: number;
  max_tokens: number;
  api_key: string;
}

/** Load primary agent from agents_config, or first agent if none is primary */
function getPrimaryAgent(): AgentConfig | null {
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT * FROM agents_config WHERE is_primary = 1 LIMIT 1'
    ).get() as AgentConfig | undefined;
    if (row) return row;
    // Fallback: first agent
    return db.prepare('SELECT * FROM agents_config LIMIT 1').get() as AgentConfig | null;
  } catch {
    return null;
  }
}

/** Load a specific agent by id */
function getAgentById(id: string): AgentConfig | null {
  try {
    const db = getDatabase();
    return db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id) as AgentConfig | null;
  } catch {
    return null;
  }
}

// Mock skills for Agent System
const mockSkills: Skill[] = [
  {
    id: 'weather',
    name: 'Weather',
    description: 'Get weather forecasts and current conditions',
    location: '/skills/weather.md',
    category: 'utilities',
    tags: ['weather', 'temperature', 'forecast', 'الطقس'],
    triggers: ['weather', 'temperature', 'الطقس'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage GitHub repositories and PRs',
    location: '/skills/github.md',
    category: 'development',
    tags: ['github', 'repository', 'pr', 'جيتهاب'],
    triggers: ['github', 'repository', 'جيتهاب'],
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    location: '/skills/web-search.md',
    category: 'utilities',
    tags: ['search', 'web', 'google', 'بحث'],
    triggers: ['search', 'find', 'ابحث'],
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations',
    location: '/skills/calculator.md',
    category: 'utilities',
    tags: ['calculate', 'math', 'حساب'],
    triggers: ['calculate', 'compute', 'احسب'],
  },
  {
    id: 'note-taking',
    name: 'Note Taking',
    description: 'Create and manage notes',
    location: '/skills/note-taking.md',
    category: 'productivity',
    tags: ['note', 'remember', 'ملاحظة'],
    triggers: ['note', 'remember', 'ملاحظة'],
  },
];

// Initialize Agent Runtime (Smart System)
const agent = new AgentRuntime({
  skills: {
    maxSelected: 5,
    confidenceThreshold: 0.5,
    enableLearning: true,
  },
});
agent.loadSkills(mockSkills);
console.log('[Chat] 🧠 Agent System loaded');

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[]; // array for multimodal (vision) messages
}

interface ChatRequest {
  model?: string;
  agentId?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
  systemPrompt?: string;
  systemPromptAppend?: string; // Extra instructions appended AFTER agent system prompt (does not replace it)
  memoryContext?: string;  // Injected relevant memories for this user
  userId?: string;         // For memory tracking
}

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat - Send chat message
  fastify.post<{ Body: ChatRequest }>('/api/chat', async (request, reply) => {
    const {
      model,
      agentId,
      messages,
      stream = true,
      temperature,
      maxTokens,
      sessionId = 'default-session',
      systemPrompt,
      systemPromptAppend,
      memoryContext,
      userId,
    } = request.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: 'Messages array is required' });
    }

    // Resolve agent config: specific agent > primary agent > fallback defaults
    const agentConfig = agentId ? getAgentById(agentId) : getPrimaryAgent();
    const resolvedModel = model || agentConfig?.model || DEFAULT_MODEL;
    const resolvedTemp = temperature ?? agentConfig?.temperature ?? 0.7;
    const resolvedMaxTokens = maxTokens ?? agentConfig?.max_tokens;
    const agentName = agentConfig?.name;

    // Load PERSONALITY.md and MEMORY.md from agent files if agent has ID
    let personalityContent = '';
    let memoryFileContent = '';
    if (agentConfig?.id) {
      try {
        personalityContent = await readPersonality(agentConfig.id);
        memoryFileContent = await readMemory(agentConfig.id);
        console.log(`[Chat] 📝 Loaded PERSONALITY.md (${personalityContent.length} chars) and MEMORY.md (${memoryFileContent.length} chars) for agent ${agentConfig.name}`);
      } catch (err) {
        console.log('[Chat] No agent files found, using database system_prompt');
      }
    }

    // Build system prompt: PERSONALITY.md > database system_prompt > none
    const rawSystemPrompt = systemPrompt || personalityContent || (agentConfig?.system_prompt?.trim() ? agentConfig.system_prompt : undefined);

    // Auto-inject agent name into system prompt if it's set and not already mentioned
    const baseSystemPrompt = agentName && rawSystemPrompt && !rawSystemPrompt.toLowerCase().includes(agentName.toLowerCase())
      ? `Your name is ${agentName}.\n\n${rawSystemPrompt}`
      : rawSystemPrompt;

    // Build complete context: Base Prompt + Agent Memory File + Session Memory
    let resolvedSystemPrompt = baseSystemPrompt || '';

    // Add MEMORY.md content if exists
    if (memoryFileContent) {
      resolvedSystemPrompt += `\n\n## Agent Memory\n${memoryFileContent}`;
    }

    // Add session memory context if available
    if (memoryContext) {
      resolvedSystemPrompt += `\n\n## Recent Context\nThe following information was recalled from previous interactions with this user:\n${memoryContext}`;
    }
    const resolvedProvider = agentConfig?.provider || 'ollama';
    const resolvedApiKey = agentConfig?.api_key || '';

    console.log('[Chat] Agent:', agentConfig?.name || 'none (fallback)', '| Provider:', resolvedProvider, '| Model:', resolvedModel);
    if (memoryContext) console.log('[Chat] 🧠 Memory context injected:', memoryContext.slice(0, 80) + '...');

    try {
      if (stream) {
        return streamChat(reply, resolvedModel, resolvedProvider, resolvedApiKey, messages, resolvedTemp, resolvedMaxTokens, sessionId, resolvedSystemPrompt, systemPromptAppend, userId);
      } else {
        return nonStreamChat(reply, resolvedModel, resolvedProvider, resolvedApiKey, messages, resolvedTemp, resolvedMaxTokens, sessionId, resolvedSystemPrompt, systemPromptAppend, userId);
      }
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Chat] Chat request failed');
    }
  });
}

// Streaming chat response
async function streamChat(
  reply: FastifyReply,
  model: string,
  provider: string,
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens?: number,
  sessionId: string = 'default-session',
  customSystemPrompt?: string,
  systemPromptAppend?: string,
  userId: string = 'default'
) {
  console.log('[Chat] 🚀 Starting stream chat');
  console.log('[Chat]   📦 Model:', model);
  console.log('[Chat]   🏭 Provider:', provider, `(type: ${typeof provider})`);
  console.log('[Chat]   🆔 Session:', sessionId);
  console.log('[Chat]   💬 Messages:', messages.length);

  // Extract user message and history
  const userMessage = messages[messages.length - 1]?.content || '';
  const history: Message[] = messages.slice(0, -1).map(m => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }));

  console.log('[Chat]   Last message:', userMessage.slice(0, 50) + '...');

  // 🧠 Use Agent System to build smart prompt
  let agentResponse;
  try {
    agentResponse = await agent.process({
      message: userMessage,
      sessionId,
      history,
    });

    console.log('[Chat] 🧠 Agent analysis complete:');
    console.log('[Chat]   Intent:', agentResponse.analysis.intent);
    console.log('[Chat]   Language:', agentResponse.analysis.language);
    console.log('[Chat]   Complexity:', agentResponse.analysis.complexity);
    console.log('[Chat]   Skills suggested:', agentResponse.analysis.requiresSkills);
    console.log('[Chat]   Prompt tokens:', agentResponse.systemPrompt.metadata.tokenCount);
  } catch (error) {
    console.error('[Chat] ⚠️ Agent error, falling back to simple mode:', error);
    // Fallback to simple mode if agent fails
    agentResponse = null;
  }

  // Build messages for Ollama with smart system prompt
  const ollamaMessages: ChatMessage[] = [];

  // Build system prompt: customSystemPrompt takes priority; fall back to SmartPromptBuilder
  // Then append systemPromptAppend (e.g. animation instructions) WITHOUT replacing the base prompt
  const baseSmartPrompt = customSystemPrompt || (agentResponse ? agentResponse.systemPrompt.full : undefined);
  const resolvedSmartPrompt = baseSmartPrompt && systemPromptAppend
    ? `${baseSmartPrompt}\n\n${systemPromptAppend}`
    : (baseSmartPrompt || systemPromptAppend);

  if (resolvedSmartPrompt) {
    ollamaMessages.push({
      role: 'system',
      content: resolvedSmartPrompt,
    });
  }

  // Add history
  ollamaMessages.push(...messages.slice(0, -1));

  // Add user message
  ollamaMessages.push({
    role: 'user',
    content: userMessage,
  });

  // Get real tools from the tools registry (11 tools: exec, read, write, browser×4, memory×2, desktop)
  const toolsRegistry = createToolsRegistry({ userId, sessionId, workspaceDir: process.cwd() });
  const tools = toolsRegistry.getToolsForAPI();

  console.log('[Chat] 🔧 Available tools:', tools.length);
  if (tools.length > 0) {
    console.log('[Chat]   Tools:', tools.map((t: any) => t.name).join(', '));
  }

  // Append json-render UI prompt to Ollama system prompt (Claude adds it separately in chat-claude.ts)
  const finalSystemPrompt = provider !== 'claude'
    ? [resolvedSmartPrompt, getJsonRenderPrompt()].filter(Boolean).join('\n\n---\n\n')
    : resolvedSmartPrompt;

  // Route to the correct provider
  if (provider === 'claude' && apiKey) {
    console.log('[Chat] 🤖 Using Claude API (agent api_key)');
    return streamChatClaude(reply, apiKey, model, ollamaMessages, finalSystemPrompt, tools, temperature, userId, sessionId);
  }

  // Fallback: check global settings for claude
  const settingsManager = getSettingsManager();
  const settings = settingsManager.getSettings();
  if ((provider === 'claude' || settings.provider === 'claude') && settings.claude?.apiKey) {
    console.log('[Chat] 🤖 Using Claude API (global settings)');
    return streamChatClaude(
      reply,
      settings.claude.apiKey,
      model || settings.claude.model || 'claude-sonnet-4-5-20250929',
      ollamaMessages,
      finalSystemPrompt,
      tools,
      temperature,
      userId,
      sessionId
    );
  }

  // Provider routing
  console.log('[Chat] 🔀 Routing to provider handler:', provider);

  // Gemini CLI provider: pipe message through local gemini binary
  if (provider === 'gemini-cli') {
    console.log('[Chat] 🖥️ Using Gemini CLI bridge');
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    try {
      // Build Gemini prompt: system instructions + json-render + user message
      const geminiSystemParts = [customSystemPrompt, getJsonRenderPrompt()].filter(Boolean).join('\n\n---\n\n');
      const geminiFullPrompt = geminiSystemParts
        ? `${geminiSystemParts}\n\n---\n\nUser: ${userMessage}`
        : userMessage;
      const result = await geminiCliTool.execute({ prompt: geminiFullPrompt });
      const text = result.content?.[0]?.text || '(no response)';
      const geminiModel = (result.details as any)?.model || 'gemini-2.0-flash';
      console.log(`[Chat] ✅ Gemini CLI responded | model: ${geminiModel} | length: ${text.length}`);
      reply.raw.write(`data: ${JSON.stringify({ content: text, done: false, model: geminiModel, provider: 'gemini-cli' })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    } catch (err: any) {
      // SECURITY: Don't expose error details in stream (H-09)
      console.error('[Chat] Gemini CLI error:', err);
      reply.raw.write(`data: ${JSON.stringify({ content: '❌ Gemini CLI request failed', done: true })}\n\n`);
    }
    reply.raw.end();
    return reply;
  }

  // Claude CLI provider: pipe message through local claude CLI binary
  if (provider === 'claude-cli') {
    console.log('[Chat] 🔧 Using Claude Code CLI bridge');
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    try {
      // Build Claude CLI prompt: system instructions + user message
      // NOTE: Skip json-render prompt for CLI to keep under Windows CMD length limit
      const claudeFullPrompt = customSystemPrompt
        ? `${customSystemPrompt}\n\nUser: ${userMessage}`
        : userMessage;
      const result = await claudeCliTool.execute({
        prompt: claudeFullPrompt,
        model: model || undefined,
        timeout: 180000  // 3 minutes
      });
      const text = result.content?.[0]?.text || '(no response)';
      const claudeModel = (result.details as any)?.model || model || 'claude-sonnet-4-5-20250929';
      console.log(`[Chat] ✅ Claude CLI responded | model: ${claudeModel} | length: ${text.length}`);
      reply.raw.write(`data: ${JSON.stringify({ content: text, done: false, model: claudeModel, provider: 'claude-cli' })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    } catch (err: any) {
      // SECURITY: Don't expose error details in stream (H-09)
      console.error('[Chat] Claude CLI error:', err);
      reply.raw.write(`data: ${JSON.stringify({ content: '❌ Claude CLI request failed', done: true })}\n\n`);
    }
    reply.raw.end();
    return reply;
  }

  // Default: use Ollama
  console.log('[Chat] 🤖 Using Ollama (local)');
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: true,
      tools: tools.length > 0 ? tools : undefined, // Add tools support
      options: {
        temperature,
        ...(maxTokens && { num_predict: maxTokens })
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Chat] ❌ Ollama error:', error);
    return reply.status(502).send({
      error: 'Ollama error',
      message: error
    });
  }

  console.log('[Chat] ✅ Ollama connected, streaming...');

  // Set up SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });

  const reader = response.body?.getReader();
  if (!reader) {
    console.error('[Chat] ❌ No reader available');
    reply.raw.end();
    return reply;
  }

  const decoder = new TextDecoder();
  let buffer = ''; // Buffer for incomplete lines
  let chunkCount = 0;
  let totalContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          processLine(buffer);
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Split by newlines and process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        processLine(line);
      }
    }
  } catch (error) {
    console.error('[Chat] ❌ Stream error:', error);
  }

  console.log('[Chat] ✅ Stream completed');
  console.log('[Chat]   Total chunks:', chunkCount);
  console.log('[Chat]   Response length:', totalContent.length, 'chars');

  reply.raw.end();
  return reply;

  function processLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const json = JSON.parse(trimmed);

      // Send content chunk
      if (json.message?.content) {
        chunkCount++;
        totalContent += json.message.content;
        reply.raw.write(`data: ${JSON.stringify({ content: json.message.content, done: false })}\n\n`);

        if (chunkCount === 1) {
          console.log('[Chat] 📡 First chunk:', json.message.content.slice(0, 30));
        }
      }

      // Send done signal
      if (json.done) {
        console.log('[Chat] 📡 Done signal received');
        reply.raw.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      }
    } catch (e) {
      // Skip invalid JSON lines
      if (trimmed.length > 0) {
        console.log('[Chat] ⚠️ Invalid JSON line:', trimmed.slice(0, 50));
      }
    }
  }
}

// Non-streaming chat response
async function nonStreamChat(
  reply: FastifyReply,
  model: string,
  provider: string,
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens?: number,
  sessionId: string = 'default-session',
  customSystemPrompt?: string,
  systemPromptAppend?: string,
  userId: string = 'default'
) {
  console.log('[Chat] 🚀 Starting non-stream chat');
  console.log('[Chat]   📦 Model:', model);
  console.log('[Chat]   🏭 Provider:', provider, `(type: ${typeof provider})`);
  console.log('[Chat]   🆔 Session:', sessionId);
  console.log('[Chat]   💬 Messages:', messages.length);

  // Extract user message and history
  const userMessage = messages[messages.length - 1]?.content || '';
  const history: Message[] = messages.slice(0, -1).map(m => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }));

  console.log('[Chat]   Last message:', userMessage.slice(0, 50) + '...');

  // 🧠 Use Agent System to build smart prompt
  let agentResponse;
  try {
    agentResponse = await agent.process({
      message: userMessage,
      sessionId,
      history,
    });

    console.log('[Chat] 🧠 Agent analysis complete:');
    console.log('[Chat]   Intent:', agentResponse.analysis.intent);
    console.log('[Chat]   Language:', agentResponse.analysis.language);
    console.log('[Chat]   Complexity:', agentResponse.analysis.complexity);
    console.log('[Chat]   Skills suggested:', agentResponse.analysis.requiresSkills);
    console.log('[Chat]   Prompt tokens:', agentResponse.systemPrompt.metadata.tokenCount);
  } catch (error) {
    console.error('[Chat] ⚠️ Agent error, falling back to simple mode:', error);
    // Fallback to simple mode if agent fails
    agentResponse = null;
  }

  // Build messages for Ollama with smart system prompt
  const ollamaMessages: ChatMessage[] = [];

  // Build system prompt: customSystemPrompt takes priority; fall back to SmartPromptBuilder
  // Then append systemPromptAppend (e.g. animation instructions) WITHOUT replacing the base prompt
  const basePromptNS = customSystemPrompt || agentResponse?.systemPrompt.full;
  const finalSystemPromptNS = basePromptNS && systemPromptAppend
    ? `${basePromptNS}\n\n${systemPromptAppend}`
    : (basePromptNS || systemPromptAppend);

  if (finalSystemPromptNS) {
    ollamaMessages.push({ role: 'system', content: finalSystemPromptNS });
  }

  // Add history
  ollamaMessages.push(...messages.slice(0, -1));

  // Add user message
  ollamaMessages.push({
    role: 'user',
    content: userMessage,
  });

  // Get real tools from the tools registry
  const toolsRegistryNS = createToolsRegistry({ userId, sessionId, workspaceDir: process.cwd() });
  const tools = toolsRegistryNS.getToolsForAPI();
  if (provider === 'claude' && apiKey) {
    console.log('[Chat] 🤖 Using Claude API (agent api_key, non-stream)');
    return streamChatClaude(reply, apiKey, model, ollamaMessages, finalSystemPromptNS, tools, temperature, userId, sessionId);
  }
  const settingsManagerNS = getSettingsManager();
  const settingsNS = settingsManagerNS.getSettings();
  if ((provider === 'claude' || settingsNS.provider === 'claude') && settingsNS.claude?.apiKey) {
    console.log('[Chat] 🤖 Using Claude API (global settings, non-stream)');
    return streamChatClaude(reply, settingsNS.claude.apiKey, model || settingsNS.claude.model || 'claude-sonnet-4-5-20250929', ollamaMessages, finalSystemPromptNS, tools, temperature, userId, sessionId);
  }

  // Gemini CLI provider (non-stream path)
  if (provider === 'gemini-cli') {
    console.log('[Chat] 🤖 Using Gemini CLI bridge (non-stream)');
    const result = await geminiCliTool.execute({ prompt: userMessage });
    const text = result.content?.[0]?.text || '(no response)';
    return reply.send({ message: { role: 'assistant', content: text } });
  }

  // Claude CLI provider (non-stream path)
  if (provider === 'claude-cli') {
    console.log('[Chat] 🔧 Using Claude Code CLI bridge (non-stream)');
    const result = await claudeCliTool.execute({
      prompt: userMessage,
      model: model || undefined,
      timeout: 180000
    });
    const text = result.content?.[0]?.text || '(no response)';
    return reply.send({ message: { role: 'assistant', content: text } });
  }

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: false,
      tools: tools.length > 0 ? tools : undefined, // Add tools support
      options: {
        temperature,
        ...(maxTokens && { num_predict: maxTokens })
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Chat] ❌ Ollama error:', error);
    return reply.status(502).send({ error: 'Ollama error', message: error });
  }

  const data = await response.json() as {
    message: { role: string; content: string };
    total_duration?: number;
    eval_count?: number;
  };

  console.log('[Chat] ✅ Response received');
  console.log('[Chat]   Response length:', data.message.content.length, 'chars');

  return {
    message: {
      role: data.message.role,
      content: data.message.content
    },
    usage: {
      totalDuration: data.total_duration,
      tokenCount: data.eval_count
    },
    // Include agent metadata
    ...(agentResponse && {
      analysis: agentResponse.analysis,
      promptMetadata: agentResponse.systemPrompt.metadata
    })
  };
}
