/**
 * Chat API Routes
 * Handles chat completions with streaming support
 * Uses primary agent from agents_config table
 */

import { beginChatTurn, instrumentChatReply, parseIdempotencyKey, replayChatOutcome, requestFingerprint } from '../../services/chat-idempotency.js';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { chunkText, openSseStream } from '../../services/chat-sse.js';
import { handleError } from '../error-handler.js';
import { AgentRuntime, type Message, type Skill } from '../../agent/index.js';
import { getSettingsManager } from '../../settings/index.js';
import { one, sql } from '../../repositories/sql-steps.js';
import { streamChatClaude } from './agentic-chat.js';
import { createAgentToolsRegistry } from '../../tools/index.js';
import { channelTurnFromHeaders, type ChannelToolPolicy } from '../../tools/channel-policy.js';
import { authenticateActiveUser } from '../../auth/route-guards.js';
import { geminiCliTool } from '../../tools/cli/gemini-cli.js';
import { claudeCliTool } from '../../tools/cli/claude-cli.js';
import { getJsonRenderPrompt } from './json-render-prompt.js';
import { safeErrorFields } from '../../services/safe-error-log.js';
import { resolveProviderApiKey } from '../../credentials/authority.js';
import { readPersonality, readMemory } from '../../services/agent-files.js';
import { getCurrentPersonality } from '../../services/personality-store.js';
import { stripPersonalityExport, traitsToBehavior, type Behavior } from '../../services/personality.js';
import { outsiderAgentMemoryEnabled } from '../../services/outsider-memory.js';
import { DrawerInputError, chatTurnDrawers, type DrawerRef } from '../../memory/drawers.js';
import { createModelRouter, ModelRouter } from '../../services/model-router.js';
import { CostTracker } from '../../services/cost-tracker.js';
import { OLLAMA_URL, DEFAULT_OLLAMA_MODEL, ollamaThinkOption } from '../../llm/ollama.js';

const DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;

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

/** Load primary agent from agents_config, or first agent if none is primary (process driver, B2.2b-4). */
async function getPrimaryAgent(): Promise<AgentConfig | null> {
  try {
    const row = await sql().read(one<AgentConfig>('SELECT * FROM agents_config WHERE is_primary = 1 ORDER BY id LIMIT 1'));
    if (row) return row;
    // Fallback: first agent
    return (await sql().read(one<AgentConfig>('SELECT * FROM agents_config ORDER BY created_at, id LIMIT 1'))) ?? null;
  } catch {
    return null;
  }
}

/** Behaviour parameters from the agent's current personality version (CORE-01). */
async function personalityBehavior(agentId: string): Promise<Behavior | null> {
  try {
    const current = await getCurrentPersonality(agentId);
    return current ? traitsToBehavior(current.traits, current.dialect) : null;
  } catch (err) {
    console.warn('[Chat] Personality unavailable, using agent defaults');
    return null;
  }
}

/** Load a specific agent by id (process driver, B2.2b-4) */
async function getAgentById(id: string): Promise<AgentConfig | null> {
  try {
    return (await sql().read(one<AgentConfig>('SELECT * FROM agents_config WHERE id = ?', id))) ?? null;
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
  /** CORE-03: the turn's active project / task / mentioned people (memory drawers to open). */
  memoryScope?: { project?: string; task?: string; people?: string[] | string; experience?: boolean };
  userId?: string;         // IGNORED (S0-Q.9): the user comes from the bearer token or the server-side channel turn
  chatContext?: {
    hasAvatarViewer?: boolean;
    isInteractiveMode?: boolean;
    hasDesktopControl?: boolean;
    sessionType?: 'minimal' | 'standard' | 'full';
  };
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
      memoryContext: bodyMemoryContext,
      memoryScope,
      chatContext,
    } = request.body || ({} as ChatRequest);

    // SECURITY (S0-Q.9): authenticate before anything else. The user is the
    // bearer-token user, or - for a channel/phone turn started by server code -
    // the user bound to that turn's server-created token. `userId` in the body
    // is ignored. A channel-turn header with an unknown/ended token is refused.
    const channelTurn = channelTurnFromHeaders(request.headers);
    let userId: string;
    if (channelTurn === null) {
      return reply.status(401).send({ error: 'Authentication required' });
    } else if (channelTurn) {
      userId = channelTurn.userId || 'default';
    } else {
      const authUser = authenticateActiveUser(request);
      if (!authUser) return reply.status(401).send({ error: 'Authentication required' });
      userId = authUser.id;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: 'Messages array is required' });
    }

    // BE-UI-01: turn ids on every frame/body; a repeated Idempotency-Key from
    // the same user within 10 minutes returns the first outcome instead of
    // running the turn again (services/chat-idempotency.ts).
    const idemKey = parseIdempotencyKey(request.headers['idempotency-key']);
    if (idemKey === 'invalid') {
      return reply.status(400).send({ error: 'Idempotency-Key must be 8-128 characters (A-Z, a-z, 0-9, _ - . :)', code: 'invalid_idempotency_key' });
    }
    // The fingerprint covers the whole request that defines the turn (CHAT-01).
    // /api/chat has no anonymous callers: the actor for the per-actor running
    // cap is the signed-in user, or for a server-created channel turn its
    // channel conversation (many outside senders share one owner user id).
    const actor = channelTurn
      ? `channel:${channelTurn.policy.channel}:${channelTurn.policy.conversationId}`
      : `user:${userId}`;
    const turn = beginChatTurn(userId, idemKey, requestFingerprint({
      agentId, sessionId, stream, messages, model, temperature, maxTokens,
      systemPrompt, systemPromptAppend, memoryContext: bodyMemoryContext, memoryScope, chatContext,
    }), actor);
    if (turn.kind === 'busy') {
      // This actor already runs its maximum of keyed turns, or (last resort)
      // every remembered key is still running: refuse rather than forget one.
      reply.header('Retry-After', '30');
      return reply.status(429).send({ error: 'Too Many Requests', code: 'rate_limited', message: 'Too many chat turns are running; try again shortly' });
    }
    if (turn.kind === 'mismatch') {
      return reply.status(422).send({ error: 'This Idempotency-Key was already used for a different request', code: 'idempotency_key_reused' });
    }
    if (turn.kind === 'in_progress') {
      return reply.status(409).send({ error: 'A request with this Idempotency-Key is still running', code: 'idempotency_in_progress', runId: turn.ids.runId, messageId: turn.ids.messageId });
    }
    if (turn.kind === 'replay') return replayChatOutcome(reply, turn.ids, turn.outcome);
    instrumentChatReply(reply, turn.ids, turn.entry);

    // Ids and sizes only: no chat context, prompts or message content in logs.
    console.log('[Chat] Turn accepted', { runId: turn.ids.runId, agentId: agentId ?? null, messages: messages.length, stream });

    // SECURITY (S0-Q.8): a channel-originated turn (Telegram/Discord/Agent Connect sender)
    // gets the restricted channel tool policy. It is bound to a server-created token,
    // never to anything in the request body.
    const toolPolicy: ChannelToolPolicy | undefined = channelTurn?.policy;

    // Resolve agent config: specific agent > primary agent > fallback defaults
    const agentConfig = agentId ? await getAgentById(agentId) : await getPrimaryAgent();
    const resolvedModel = model || agentConfig?.model || DEFAULT_MODEL;
    // CORE-01: the agent's current personality version sets temperature,
    // output length and the working-style prompt block. An explicit request
    // value still wins. Personality never changes tools or approvals: the
    // tool registry below is built from grants only.
    const behavior = agentConfig?.id ? await personalityBehavior(agentConfig.id) : null;
    const resolvedTemp = temperature ?? behavior?.temperature ?? agentConfig?.temperature ?? 0.7;
    const resolvedMaxTokens = maxTokens ?? behavior?.maxTokens ?? agentConfig?.max_tokens;
    const agentName = agentConfig?.name;

    // SECURITY (S0-A.14): a channel turn answers an outside sender, so the
    // agent's private MEMORY.md and recalled memory context stay out of the
    // prompt unless the server opts in (OUTSIDER_AGENT_MEMORY=true).
    const includeAgentMemory = !channelTurn || outsiderAgentMemoryEnabled();
    const memoryContext = includeAgentMemory ? bodyMemoryContext : undefined;

    // CORE-03: memory drawers the agent's memory tools may read this turn. The
    // user's own chat opens owner + experience + only the named project/task/
    // people drawers; a channel turn (outsider) opens none.
    let memoryDrawers: DrawerRef[];
    try {
      memoryDrawers = chatTurnDrawers(includeAgentMemory, memoryScope);
    } catch (err) {
      if (err instanceof DrawerInputError) return reply.status(400).send({ error: 'Invalid memoryScope' });
      throw err;
    }

    // Load PERSONALITY.md and MEMORY.md from agent files if agent has ID
    let personalityContent = '';
    let memoryFileContent = '';
    if (agentConfig?.id) {
      try {
        // The generated settings block is a readable export; the database values are used instead.
        personalityContent = stripPersonalityExport(await readPersonality(agentConfig.id));
        memoryFileContent = includeAgentMemory ? await readMemory(agentConfig.id) : '';
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

    // Build complete context: Base Prompt + Personality settings + Agent Memory File + Session Memory
    let resolvedSystemPrompt = baseSystemPrompt || '';

    if (behavior) {
      resolvedSystemPrompt = resolvedSystemPrompt
        ? `${resolvedSystemPrompt}\n\n${behavior.promptBlock}`
        : behavior.promptBlock;
    }

    // Add MEMORY.md content if exists
    if (memoryFileContent) {
      resolvedSystemPrompt += `\n\n## Agent Memory\n${memoryFileContent}`;
    }

    // Add session memory context if available
    if (memoryContext) {
      resolvedSystemPrompt += `\n\n## Recent Context\nThe following information was recalled from previous interactions with this user:\n${memoryContext}`;
    }
    // An agent's explicit provider wins; without one, follow the global settings provider.
    const resolvedProvider = agentConfig?.provider
      || (getSettingsManager().getSettings().provider === 'claude' ? 'claude' : 'ollama');
    // SECURITY (S1.1): keys come from the credential authority only: the
    // agent's own encrypted key, else the global Settings key.
    const resolvedApiKey = resolvedProvider === 'claude'
      ? await resolveProviderApiKey('claude', { agentId: agentConfig?.id })
      : '';

    console.log('[Chat] Agent:', agentConfig?.name || 'none (fallback)', '| Provider:', resolvedProvider, '| Model:', resolvedModel);
    if (memoryContext) console.log('[Chat] Memory context injected', { chars: String(memoryContext).length });

    // CLI bridge providers run a separate local agent with its own tools; never for channel turns.
    if (toolPolicy && (resolvedProvider === 'gemini-cli' || resolvedProvider === 'claude-cli')) {
      return reply.status(403).send({ error: 'This agent provider is not available for channel messages' });
    }

    // CHAT-01: a stream turn sends its SSE headers (and starts the heartbeat)
    // as soon as it is accepted, before any model is contacted.
    if (stream) openSseStream(reply.raw);

    try {
      if (stream) {
        return await streamChat(reply, resolvedModel, resolvedProvider, resolvedApiKey, messages, resolvedTemp, resolvedMaxTokens, sessionId, resolvedSystemPrompt, systemPromptAppend, userId, chatContext, toolPolicy, agentConfig?.id, memoryDrawers);
      } else {
        const out = await nonStreamChat(reply, resolvedModel, resolvedProvider, resolvedApiKey, messages, resolvedTemp, resolvedMaxTokens, sessionId, resolvedSystemPrompt, systemPromptAppend, userId, chatContext, toolPolicy, agentConfig?.id, memoryDrawers);
        // A plain result object goes through reply.send so it gets the turn ids.
        return (out as unknown) === reply ? reply : reply.send(out);
      }
    } catch (error: any) {
      if (reply.raw.headersSent) {
        // The stream is open: end it with the one typed error event (H-09).
        console.error('[Chat] Chat request failed:', error?.name || 'Error');
        if (!reply.raw.writableEnded) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Chat request failed' })}\n\n`);
          reply.raw.end();
        }
        return reply;
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Chat] Chat request failed');
    }
  });
}

/** Text per answer frame for one-shot answers (CLI bridges). */
const ANSWER_FRAME_BYTES = 4 * 1024;

/** The model could not be reached or refused: one generic error, no upstream text (H-09). */
function modelUnavailable(reply: FastifyReply): FastifyReply {
  if (reply.raw.headersSent) {
    if (!reply.raw.writableEnded) {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Chat request failed', code: 'model_unavailable' })}\n\n`);
      reply.raw.end();
    }
    return reply;
  }
  return reply.status(502).send({ error: 'Model unavailable', code: 'model_unavailable' });
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
  userId: string = 'default',
  chatContext?: any,
  toolPolicy?: ChannelToolPolicy,
  agentId?: string,
  memoryDrawers?: DrawerRef[]
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

  console.log('[Chat]   Last message length:', typeof userMessage === 'string' ? userMessage.length : 'multimodal');

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
  const toolsRegistry = await createAgentToolsRegistry({ userId, sessionId, workspaceDir: process.cwd(), toolPolicy, agentId, memoryDrawers });
  const tools = toolsRegistry.getToolsForAPI();

  console.log('[Chat] 🔧 Available tools:', tools.length);
  if (tools.length > 0) {
    console.log('[Chat]   Tools:', tools.map((t: any) => t.name).join(', '));
  }

  // Build tool usage instructions for Ollama (explicit instructions required)
  const toolInstructions = tools.length > 0 ? `

## CRITICAL: Tool Usage Instructions

You have access to ${tools.length} powerful tools. **YOU MUST USE THEM** when the task requires external data or actions:

Available tools: ${tools.map((t: any) => t.name).join(', ')}

**RULES:**
1. When user asks for real-time data (weather, stocks, news, web info) → ALWAYS use web_fetch tool first
2. When user asks to browse a website → use browser tools
3. When user asks to control the computer → use desktop_control tool
4. NEVER say "I cannot access" or "I don't have access" - TRY THE TOOL FIRST!
5. Use tools in parallel when possible for faster results
6. After getting tool results, present the data using \`\`\`spec blocks for visual display

**Example workflow:**
User: "What's the weather in Basra?"
You: [Call web_fetch tool to get weather data]
You: [Present results with \`\`\`spec blocks showing temperature, conditions, etc.]
` : '';

  // Append json-render UI prompt + tool instructions to Ollama system prompt
  const finalSystemPrompt = provider !== 'claude'
    ? [resolvedSmartPrompt, toolInstructions, getJsonRenderPrompt()].filter(Boolean).join('\n\n---\n\n')
    : resolvedSmartPrompt;

  // Update ollamaMessages system prompt to include JSON render instructions (for non-Claude providers)
  if (provider !== 'claude' && ollamaMessages.length > 0 && ollamaMessages[0].role === 'system') {
    ollamaMessages[0].content = finalSystemPrompt ?? '';
  }

  // 💰 COST OPTIMIZATION: Smart model routing based on task complexity
  let selectedModel = model;
  let routingAnalysis = null;

  if (provider === 'claude' || provider === undefined) {
    const router = createModelRouter({
      costOptimizationEnabled: true, // Enable by default - can make configurable later
    });

    // Analyze task and get recommended model
    const toolNames = tools.map((t: any) => t.name);
    routingAnalysis = router.analyzeAndRoute(userMessage, history, toolNames);

    // Convert tier to actual Claude model name
    selectedModel = ModelRouter.getModelName(routingAnalysis.recommendedModel);

    console.log('[Cost Optimizer] 🎯 Task analysis:');
    console.log('[Cost Optimizer]   Complexity:', routingAnalysis.complexity);
    console.log('[Cost Optimizer]   Recommended model:', routingAnalysis.recommendedModel, `(${selectedModel})`);
    console.log('[Cost Optimizer]   Reasoning:', routingAnalysis.reasoning);
    console.log('[Cost Optimizer]   Estimated savings:', `${routingAnalysis.estimatedCostSavings}%`);

    // Log usage to cost tracker (async, don't block response)
    CostTracker.logUsage({
      user_id: userId,
      session_id: sessionId,
      timestamp: Date.now(),
      model_used: routingAnalysis.recommendedModel,
      task_complexity: routingAnalysis.complexity,
      message_length: userMessage.length,
      tools_used: toolNames.join(','),
      estimated_savings_percent: routingAnalysis.estimatedCostSavings || 0,
    }).catch((err) => {
      console.error('[Cost Optimizer] ⚠️ Failed to log usage:', err);
    });
  }

  // Route to the correct provider (key resolved by the credential authority, S1.1)
  if (provider === 'claude' && apiKey) {
    console.log('[Chat] 🤖 Using Claude API');
    return streamChatClaude(
      reply,
      apiKey,
      selectedModel || getSettingsManager().getSettings().claude?.model || 'claude-sonnet-4-5-20250929',
      ollamaMessages,
      finalSystemPrompt,
      tools,
      temperature,
      userId,
      sessionId,
      chatContext,
      toolPolicy,
      agentId,
      maxTokens,
      memoryDrawers
    );
  }

  // Provider routing
  console.log('[Chat] 🔀 Routing to provider handler:', provider);

  // Gemini CLI provider: pipe message through local gemini binary
  if (provider === 'gemini-cli') {
    console.log('[Chat] 🖥️ Using Gemini CLI bridge');
    openSseStream(reply.raw);
    const startedAt = Date.now();
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
      for (const part of chunkText(text, ANSWER_FRAME_BYTES)) {
        reply.raw.write(`data: ${JSON.stringify({ content: part, done: false, model: geminiModel, provider: 'gemini-cli' })}\n\n`);
      }
      reply.raw.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    } catch (err: any) {
      // SECURITY: Don't expose error details in stream (H-09)
      // FU-01: safe fields only; the error can carry stderr, the prompt or paths.
      console.error('[Chat] Gemini CLI error', safeErrorFields(err, startedAt));
      // BUG-02 (CHAT-01): the typed terminal error frame, never text plus done.
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Chat request failed' })}\n\n`);
    }
    reply.raw.end();
    return reply;
  }

  // Claude CLI provider: pipe message through local claude CLI binary
  if (provider === 'claude-cli') {
    console.log('[Chat] 🔧 Using Claude Code CLI bridge');
    openSseStream(reply.raw);
    const startedAt = Date.now();
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
      }, { workspaceDir: process.cwd(), userId, sessionId, agentId });
      const text = result.content?.[0]?.text || '(no response)';
      const claudeModel = (result.details as any)?.model || model || 'claude-sonnet-4-5-20250929';
      console.log(`[Chat] ✅ Claude CLI responded | model: ${claudeModel} | length: ${text.length}`);
      for (const part of chunkText(text, ANSWER_FRAME_BYTES)) {
        reply.raw.write(`data: ${JSON.stringify({ content: part, done: false, model: claudeModel, provider: 'claude-cli' })}\n\n`);
      }
      reply.raw.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    } catch (err: any) {
      // SECURITY: Don't expose error details in stream (H-09)
      // FU-01: safe fields only; the error can carry stderr, the prompt or paths.
      console.error('[Chat] Claude CLI error', safeErrorFields(err, startedAt));
      // BUG-02 (CHAT-01): the typed terminal error frame, never text plus done.
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Chat request failed' })}\n\n`);
    }
    reply.raw.end();
    return reply;
  }

  // Default: use Ollama
  console.log('[Chat] 🤖 Using Ollama (local)');
  // CHAT-01: headers go out before Ollama is contacted, so a cold model load
  // cannot trip a pre-header timeout; the heartbeat keeps the stream alive.
  openSseStream(reply.raw);
  // The client went away before the reply ended: stop the model (CHAT-01).
  const upstreamAbort = new AbortController();
  reply.raw.once?.('close', () => { if (!reply.raw.writableEnded) upstreamAbort.abort(); });
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      signal: upstreamAbort.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: true,
        ...ollamaThinkOption(),
        tools: tools.length > 0 ? tools : undefined, // Add tools support
        options: {
          temperature,
          ...(maxTokens && { num_predict: maxTokens })
        }
      })
    });
  } catch (err: any) {
    console.error('[Chat] ❌ Ollama unreachable:', err?.name || 'Error');
    return modelUnavailable(reply);
  }

  if (!response.ok) {
    // SECURITY (H-09): the upstream body is never read, logged or relayed.
    console.error('[Chat] ❌ Ollama request failed', { status: response.status });
    try { await response.body?.cancel(); } catch { /* ignore */ }
    return modelUnavailable(reply);
  }

  console.log('[Chat] ✅ Ollama connected, streaming...');

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
          console.log('[Chat] 📡 First chunk received');
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
        console.log('[Chat] ⚠️ Invalid JSON line', { chars: trimmed.length });
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
  userId: string = 'default',
  chatContext?: any,
  toolPolicy?: ChannelToolPolicy,
  agentId?: string,
  memoryDrawers?: DrawerRef[]
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

  console.log('[Chat]   Last message length:', typeof userMessage === 'string' ? userMessage.length : 'multimodal');

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
  const toolsRegistryNS = await createAgentToolsRegistry({ userId, sessionId, workspaceDir: process.cwd(), toolPolicy, agentId, memoryDrawers });
  const tools = toolsRegistryNS.getToolsForAPI();
  if (provider === 'claude' && apiKey) {
    console.log('[Chat] 🤖 Using Claude API (non-stream)');
    return streamChatClaude(reply, apiKey, model || getSettingsManager().getSettings().claude?.model || 'claude-sonnet-4-5-20250929', ollamaMessages, finalSystemPromptNS, tools, temperature, userId, sessionId, chatContext, toolPolicy, agentId, maxTokens, memoryDrawers);
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
    }, { workspaceDir: process.cwd(), userId, sessionId, agentId });
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
      ...ollamaThinkOption(),
      tools: tools.length > 0 ? tools : undefined, // Add tools support
      options: {
        temperature,
        ...(maxTokens && { num_predict: maxTokens })
      }
    })
  });

  if (!response.ok) {
    // SECURITY (H-09): the upstream body is never read, logged or relayed.
    console.error('[Chat] ❌ Ollama request failed', { status: response.status });
    try { await response.body?.cancel(); } catch { /* ignore */ }
    return reply.status(502).send({ error: 'Model unavailable', code: 'model_unavailable' });
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
