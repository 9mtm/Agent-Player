/**
 * Agent Cron Service
 *
 * Runs scheduled heartbeats for agents that have cron_enabled=1.
 * On each tick: checks for assigned tasks → executes via agentic loop.
 *
 * Uses node-cron (already installed). Non-streaming execution —
 * results are stored back on the orchestrator task, not streamed to a client.
 */

import cron from 'node-cron';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { getDatabase } from '../db/index.js';
import { getOrchestrator } from '../multi-agent/index.js';
import { ClaudeClient } from '../llm/claude-client.js';
import { createToolsRegistry } from '../tools/index.js';
import { logActivity } from './activity-logger.js';

const HEARTBEAT_OK_TOKEN = 'HEARTBEAT_OK';
const HEARTBEAT_ACK_MAX_CHARS = 300;

/**
 * Read HEARTBEAT.md from the workspace directory.
 * Checks per-agent file first (HEARTBEAT-{agentName}.md), then global HEARTBEAT.md.
 * Returns null if no file exists or the file is effectively empty (only headings/blank lines).
 */
function readHeartbeatFile(agentName: string): string | null {
  const workspaceDir = process.cwd();
  const candidates = [
    path.join(workspaceDir, `HEARTBEAT-${agentName}.md`),
    path.join(workspaceDir, 'HEARTBEAT.md'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf-8');
    // Skip effectively empty files (only blank lines and markdown headings)
    const stripped = content.replace(/^#+\s.*$/gm, '').trim();
    if (!stripped) continue;
    return content.trim();
  }
  return null;
}

/**
 * Run a lightweight heartbeat check for an agent when no tasks are assigned.
 * Sends the HEARTBEAT.md checklist to the agent; logs an alert if the agent
 * returns anything other than a HEARTBEAT_OK acknowledgment.
 */
async function runHeartbeat(agent: AgentRow, heartbeatContent: string): Promise<void> {
  const db = getDatabase();
  let apiKey = agent.api_key;
  if (!apiKey) {
    const settings = db.prepare(`SELECT value FROM settings WHERE key = 'claude_api_key' LIMIT 1`).get() as { value: string } | undefined;
    apiKey = settings?.value ?? null;
  }

  if (!apiKey || agent.provider !== 'claude') return;

  const claude = new ClaudeClient(apiKey, agent.model);
  const systemPrompt = agent.system_prompt ?? `You are ${agent.name}, an AI agent.`;
  const prompt =
    `Read the HEARTBEAT.md checklist below. Follow it strictly. ` +
    `Do not infer or repeat old tasks from prior context. ` +
    `If nothing needs attention, reply with exactly: HEARTBEAT_OK\n\n` +
    `## HEARTBEAT.md\n${heartbeatContent}`;

  let response: any;
  try {
    response = await claude.sendMessage(
      [{ role: 'user', content: prompt }],
      { systemPrompt, temperature: agent.temperature, maxTokens: 1024 },
    );
  } catch (err: any) {
    console.warn(`[AgentCron] ⚠️  Heartbeat API error for "${agent.name}": ${err.message}`);
    return;
  }

  const reply: string = (response.content ?? '').trim();

  // Detect HEARTBEAT_OK at start or end
  const startsOk = reply.startsWith(HEARTBEAT_OK_TOKEN);
  const endsOk = reply.endsWith(HEARTBEAT_OK_TOKEN);

  if (startsOk || endsOk) {
    const withoutToken = reply
      .replace(/^HEARTBEAT_OK\s*/i, '')
      .replace(/\s*HEARTBEAT_OK$/i, '')
      .trim();
    if (withoutToken.length <= HEARTBEAT_ACK_MAX_CHARS) {
      // Silent acknowledgment — nothing to report
      console.log(`[AgentCron] 💓 "${agent.name}" heartbeat OK`);
      return;
    }
  }

  // Agent sent an alert — log it as activity so it shows in the feed
  console.log(`[AgentCron] 🔔 Heartbeat ALERT from "${agent.name}": ${reply.slice(0, 120)}`);
  await logActivity({
    agentId: agent.id,
    actionType: 'task_completed',
    summary: `[HEARTBEAT] ${reply.slice(0, 200)}`,
  });
}

interface AgentRow {
  id: string;
  name: string;
  model: string;
  provider: string;
  system_prompt: string | null;
  api_key: string | null;
  temperature: number;
  max_tokens: number;
  cron_schedule: string;
  cron_enabled: number;
}

const activeJobs = new Map<string, cron.ScheduledTask>();

/**
 * Run a single task for a given agent using the agentic tool loop (no streaming).
 */
async function runAgentTask(agent: AgentRow, taskId: string, taskDescription: string): Promise<string> {
  const orchestrator = getOrchestrator();

  // Mark task as in-progress
  orchestrator.startTask(taskId);
  await logActivity({
    agentId: agent.id,
    taskId,
    actionType: 'task_started',
    summary: `Agent ${agent.name} started task`,
  });

  // Resolve API key — agent key takes priority
  const db = getDatabase();
  let apiKey = agent.api_key;
  if (!apiKey) {
    const settings = db.prepare(`SELECT value FROM settings WHERE key = 'claude_api_key' LIMIT 1`).get() as { value: string } | undefined;
    apiKey = settings?.value ?? null;
  }

  if (!apiKey || agent.provider !== 'claude') {
    const msg = `Agent "${agent.name}" has no Claude API key configured or provider is not claude.`;
    console.warn(`[AgentCron] ⚠️  ${msg}`);
    orchestrator.failTask(taskId, msg);
    await logActivity({ agentId: agent.id, taskId, actionType: 'task_failed', summary: msg });
    return msg;
  }

  const claude = new ClaudeClient(apiKey, agent.model);
  const toolsRegistry = createToolsRegistry({
    userId: agent.id,
    sessionId: `cron-${taskId}`,
    workspaceDir: process.cwd(),
  });

  const tools = toolsRegistry.getToolsForAPI();
  const systemPrompt = agent.system_prompt ?? `You are ${agent.name}, an AI agent.`;

  const loopMessages: Array<{ role: 'user' | 'assistant'; content: string | any[] }> = [
    { role: 'user', content: taskDescription },
  ];

  const MAX_ITERATIONS = 15;
  let iteration = 0;
  let finalContent = '';

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    let response: any;
    try {
      response = await claude.sendMessage(loopMessages, {
        systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens,
      });
    } catch (err: any) {
      const errMsg = `Claude API error: ${err.message}`;
      orchestrator.failTask(taskId, errMsg);
      await logActivity({ agentId: agent.id, taskId, actionType: 'task_failed', summary: errMsg });
      return errMsg;
    }

    if (!response.toolCalls || response.toolCalls.length === 0) {
      finalContent = response.content;
      break;
    }

    // Add assistant turn
    loopMessages.push({
      role: 'assistant',
      content: response.rawBlocks || response.content,
    });

    // Execute tools
    const toolResults: any[] = [];
    for (const toolCall of response.toolCalls) {
      try {
        const result = await toolsRegistry.execute(toolCall.tool, toolCall.arguments);
        const resultText = result.content?.[0]?.text ?? JSON.stringify(result);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result.content ?? [{ type: 'text', text: resultText }],
        });

        await logActivity({
          agentId: agent.id,
          taskId,
          sessionId: `cron-${taskId}`,
          actionType: 'tool_called',
          toolName: toolCall.tool,
          summary: resultText.slice(0, 200),
        });
      } catch (err: any) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          is_error: true,
        });
      }
    }

    loopMessages.push({ role: 'user', content: toolResults });
  }

  // Read recurring metadata before completing (it's on the task's input)
  const completedTask = orchestrator.getTask(taskId);
  const taskMeta = (completedTask?.input as any)?._meta as
    | { repeat_schedule?: string; repeat_assigned_to?: string }
    | undefined;

  // Mark task done
  orchestrator.completeTask(taskId, { output: finalContent });
  await logActivity({
    agentId: agent.id,
    taskId,
    actionType: 'task_completed',
    summary: finalContent.slice(0, 200),
  });

  // Auto-recreate if this is a recurring task
  if (taskMeta?.repeat_schedule && completedTask) {
    try {
      const assignToId = taskMeta.repeat_assigned_to ?? completedTask.assignedTo ?? agent.id;
      // Preserve _meta but strip _upstream from input for the fresh run
      const { _upstream, ...cleanInput } = (completedTask.input as Record<string, unknown> | undefined) ?? {};
      const newTask = orchestrator.createTask({
        title: completedTask.title,
        description: completedTask.description,
        priority: completedTask.priority as any,
        inputData: Object.keys(cleanInput).length > 0 ? cleanInput : undefined,
      });
      orchestrator.assignTask(newTask.id, assignToId);
      console.log(`[AgentCron] 🔄 Recurring task "${completedTask.title}" re-queued (schedule: ${taskMeta.repeat_schedule})`);
    } catch (err: any) {
      console.warn(`[AgentCron] ⚠️  Failed to re-queue recurring task: ${err.message}`);
    }
  }

  // Clean up desktop indicator if used
  try {
    await toolsRegistry.execute('desktop_control', { action: 'hide_indicator' });
  } catch { /* ignore */ }

  return finalContent;
}

/**
 * Register cron heartbeat for a single agent.
 */
function registerAgentCron(agent: AgentRow): void {
  // Remove existing job if re-registering
  const existing = activeJobs.get(agent.id);
  if (existing) {
    existing.stop();
    activeJobs.delete(agent.id);
  }

  if (!cron.validate(agent.cron_schedule)) {
    console.warn(`[AgentCron] ⚠️  Invalid cron schedule for agent "${agent.name}": ${agent.cron_schedule}`);
    return;
  }

  const task = cron.schedule(agent.cron_schedule, async () => {
    const db = getDatabase();

    // Update last_heartbeat
    db.prepare(`UPDATE agents_config SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = ?`).run(agent.id);

    // Check for an assigned task
    const orchestrator = getOrchestrator();
    const tasks = orchestrator.listTasks({ assignedTo: agent.id, status: 'assigned', limit: 1 });

    if (tasks.length === 0) {
      // No tasks assigned — run heartbeat check if HEARTBEAT.md exists
      const heartbeatContent = readHeartbeatFile(agent.name);
      if (heartbeatContent) {
        try {
          await runHeartbeat(agent, heartbeatContent);
        } catch (err: any) {
          console.warn(`[AgentCron] ⚠️  Heartbeat error for "${agent.name}": ${err.message}`);
        }
      }
      return;
    }

    const pendingTask = tasks[0];
    console.log(`[AgentCron] 🔄 Agent "${agent.name}" picked up task: "${pendingTask.title}"`);

    try {
      // Build task prompt — include upstream pipeline output if available
      let taskPrompt = `${pendingTask.title}\n\n${pendingTask.description}`;
      const taskInput = pendingTask.input as Record<string, unknown> | undefined;
      if (taskInput?._upstream && typeof taskInput._upstream === 'object') {
        const upstream = JSON.stringify(taskInput._upstream, null, 2);
        taskPrompt += `\n\n## Results from Previous Tasks (Pipeline Input)\n\`\`\`json\n${upstream}\n\`\`\`\nUse these results as context for your work.`;
      }

      await runAgentTask(agent, pendingTask.id, taskPrompt);
      console.log(`[AgentCron] ✅ Task "${pendingTask.title}" completed`);
    } catch (err: any) {
      console.error(`[AgentCron] ❌ Task "${pendingTask.title}" failed:`, err.message);
    }
  });

  activeJobs.set(agent.id, task);
  console.log(`[AgentCron] ⏰ Registered cron for agent "${agent.name}" (${agent.cron_schedule})`);
}

/**
 * Start the agent cron service.
 * Called once at server startup.
 */
export async function startAgentCronService(): Promise<void> {
  const db = getDatabase();

  const agents = db.prepare(`
    SELECT id, name, model, provider, system_prompt, api_key, temperature, max_tokens, cron_schedule, cron_enabled
    FROM agents_config
    WHERE cron_enabled = 1 AND cron_schedule IS NOT NULL
  `).all() as AgentRow[];

  if (agents.length === 0) {
    console.log('[AgentCron] ℹ️  No agents with cron enabled at startup');
    return;
  }

  for (const agent of agents) {
    registerAgentCron(agent);
  }

  console.log(`[AgentCron] ✅ Started ${agents.length} agent cron job(s)`);
}

/**
 * Refresh cron jobs when an agent's config changes.
 * Call this from the agents-config PUT route when cron fields are updated.
 */
export function refreshAgentCron(agentId: string): void {
  const db = getDatabase();
  const agent = db.prepare(`
    SELECT id, name, model, provider, system_prompt, api_key, temperature, max_tokens, cron_schedule, cron_enabled
    FROM agents_config WHERE id = ?
  `).get(agentId) as AgentRow | undefined;

  if (!agent) return;

  if (agent.cron_enabled && agent.cron_schedule) {
    registerAgentCron(agent);
  } else {
    // Disable cron
    const existing = activeJobs.get(agentId);
    if (existing) {
      existing.stop();
      activeJobs.delete(agentId);
      console.log(`[AgentCron] 🛑 Stopped cron for agent "${agent.name}"`);
    }
  }
}
