/**
 * Claude Streaming Chat Handler with Agentic Tool Loop
 *
 * Implements full tool_use cycle:
 *   1. Send message to Claude with tools
 *   2. If Claude calls tools → execute them, send results back
 *   3. Repeat until Claude returns final text (stop_reason = end_turn)
 *   4. Stream final response to client via SSE
 */

import * as os from 'node:os';
import type { FastifyReply } from 'fastify';
import { ClaudeClient } from '../../llm/claude-client.js';
import { createToolsRegistry } from '../../tools/index.js';
import { loadClaudeProjectMemory } from './claude-local.js';
import { buildAiToolsContext } from './ai-tools.js';
import { getJsonRenderPrompt } from './json-render-prompt.js';

// ─── OS detection (runs once at module load) ──────────────────────────────────

function buildOsContext(): string {
  const platform = process.platform;
  const arch     = process.arch;
  const release  = os.release();

  if (platform === 'win32') {
    const ver = release.startsWith('10.0') ? 'Windows 10/11' : `Windows (${release})`;
    return (
      `## System Information\n` +
      `OS: ${ver} (win32, ${arch})\n` +
      `Shell: PowerShell\n` +
      `Key modifier: Ctrl (not Cmd)\n` +
      `App launcher: Start-Process "AppName" in PowerShell\n` +
      `Home directory: C:\\Users\\<username>\\\n` +
      `Path separator: \\\n`
    );
  }

  if (platform === 'darwin') {
    return (
      `## System Information\n` +
      `OS: macOS (darwin, ${arch})\n` +
      `Shell: bash / zsh\n` +
      `Key modifier: Cmd (⌘) — use "command" in pyautogui hotkeys\n` +
      `App launcher: open -a "AppName"\n` +
      `Home directory: /Users/<username>/\n` +
      `Path separator: /\n`
    );
  }

  const distro = (() => {
    try {
      const { execSync } = require('node:child_process');
      return execSync('lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2', { timeout: 1000 }).toString().trim().replace(/"/g, '');
    } catch { return 'Linux'; }
  })();

  return (
    `## System Information\n` +
    `OS: ${distro} (linux, ${arch})\n` +
    `Shell: bash\n` +
    `Key modifier: Ctrl\n` +
    `App launcher: use the app binary name directly, or xdg-open for files\n` +
    `Home directory: /home/<username>/\n` +
    `Path separator: /\n`
  );
}

const OS_CONTEXT = buildOsContext();

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

/**
 * Stream chat using Claude API with full agentic tool loop
 */
export async function streamChatClaude(
  reply: FastifyReply,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  tools: any[],
  temperature: number,
  userId: string = 'default',
  sessionId: string = 'default'
): Promise<FastifyReply> {
  console.log('[Chat] 🚀 Starting Claude agentic stream');
  console.log('[Chat]   Model:', model);
  console.log('[Chat]   Messages:', messages.length);
  console.log('[Chat]   Tools offered:', tools.length);

  // Set up SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked',
  });

  try {
    const claude = new ClaudeClient(apiKey, model);

    // Build tools registry for execution
    const toolsRegistry = createToolsRegistry({ userId, sessionId, workspaceDir: process.cwd() });

    // Convert messages to Claude format (filter out system role)
    let loopMessages: Array<{ role: 'user' | 'assistant'; content: string | any[] }> = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // For desktop/browser tasks allow many more steps
    const MAX_ITERATIONS = 25;
    let iteration = 0;
    let finalContent = '';
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 4;

    // Load project MEMORY.md from Claude Code's ~/.claude directory (silent if missing)
    const [projectMemory, aiToolsContext] = await Promise.all([
      loadClaudeProjectMemory(),
      buildAiToolsContext(),
    ]);
    const baseSystemPrompt = [
      projectMemory ? `# Project Memory\n\n${projectMemory}` : '',
      systemPrompt || '',
      aiToolsContext,
      getJsonRenderPrompt(),
    ].filter(Boolean).join('\n\n---\n\n');

    // Inject OS context + persistence instructions into system prompt
    const agenticSystemPrompt = baseSystemPrompt +
      '\n\n' + OS_CONTEXT +
      '\n\n## Conversation Context Rules\n' +
      '- The conversation history is always available — USE IT to understand short follow-up commands.\n' +
      '- A short one-word follow-up (in any language) means: REPEAT THE LAST TASK from history.\n' +
      '  → Look at the previous messages, understand what was being done, and do it again.\n' +
      '  → Never ask for clarification on a retry request. Just do it.\n' +
      '- Pronouns and vague references always refer to the most recent topic in the conversation.\n' +
      '- Always end your final reply with: "Last task: [brief description]"\n' +
      '\n\n## Agent Execution Rules\n' +
      '- Always complete the FULL task without stopping early. Keep making tool calls until done.\n' +
      '- NEVER return a final text reply mid-task — only reply when the entire user request is finished.\n' +
      '- Before starting a multi-step task, state your plan: "Plan: 1. ... 2. ... 3. ...". Then execute each step.\n' +
      '- After each interaction (click, type, etc.), take screenshot(screen=N) to verify the result before the next step.\n' +
      '- If a step fails, try an alternative approach (different coordinates, keyboard shortcut, or method).\n' +
      '\n## Narration Format (use this structure after each screenshot)\n' +
      'After every screenshot, write a short status line in this exact format:\n' +
      '  ✅ [what you just did]  →  Next: [what you will do next]\n' +
      'Examples:\n' +
      '  ✅ Word opened on screen 1  →  Next: click the document area\n' +
      '  ✅ Clicked document area  →  Next: type the requested text\n' +
      '  ✅ Text typed  →  Next: press Ctrl+S to save\n' +
      'This keeps the user informed at every step and helps you track progress.\n' +
      '\n## Desktop Workflow — follow this order exactly\n' +
      'Step 1: exec → launch the app with PowerShell Start-Process\n' +
      'Step 2: wait(3) → give the app time to fully open\n' +
      'Step 3: get_active_window → learn which screen=N the app opened on\n' +
      'Step 4: show_indicator(screen=N) → READ the result carefully — it tells you the monitor left/top offset\n' +
      'Step 5: screenshot(screen=N) → SEE the current state of that screen\n' +
      'Step 6: interact using ABSOLUTE coordinates: x = monitor.left + localX, y = monitor.top + localY\n' +
      'Step 7: screenshot(screen=N) after each action to verify → then continue next step\n' +
      'Step 8: hide_indicator() — call this as your LAST tool call, BEFORE writing the final reply\n' +
      '\n## IMPORTANT — Screenshots\n' +
      '- ALWAYS use screenshot(screen=N) to see a specific monitor — NEVER call screenshot without screen param.\n' +
      '- A combined all-screens image is extremely wide and misleading; always target a specific screen.\n' +
      '- If you do not yet know which screen, call get_active_window first (Step 3 above).\n' +
      '\n## Coordinate Rules — READ THIS CAREFULLY\n' +
      '- All mouse coordinates are ABSOLUTE screen pixels.\n' +
      '- show_indicator result contains: "Monitor offset: left=X, top=Y" — SAVE THESE VALUES.\n' +
      '- For every click: x = left_offset + pixel_from_screenshot_left, y = top_offset + pixel_from_screenshot_top.\n' +
      '- Primary screen (left=0, top=0): click x = localX, y = localY (no offset needed).\n' +
      '- Second screen to the RIGHT (left=1920, top=0): click x = 1920 + localX, y = localY.\n' +
      '- Second screen to the LEFT (left=-1920, top=0): click x = -1920 + localX, y = localY.\n' +
      '- NEVER use local coordinates from screenshot without adding the monitor offset first.\n' +
      '\n## Opening Windows Applications\n' +
      '- Use exec (PowerShell) — never the Win key (Start menu closes before next tool call).\n' +
      '- Word:    exec → Start-Process "WINWORD"\n' +
      '- Excel:   exec → Start-Process "EXCEL"\n' +
      '- Notepad: exec → Start-Process "notepad"\n' +
      '- Browser: exec → Start-Process "chrome"  (or "msedge" / "firefox")\n' +
      '- Other:   exec → Start-Process "appname"  or  Start-Process -FilePath "C:\\\\full\\\\path.exe"\n' +
      '\n## Desktop Interaction Tips\n' +
      '- Scroll: scroll(x, y, amount) — amount > 0 = up, amount < 0 = down.\n' +
      '- Drag:   drag(start_x, start_y, end_x, end_y) — for sliders, window resize, text select.\n' +
      '- Keyboard shortcuts are often faster than clicking menus (e.g. Ctrl+S to save).\n';

    // Strip image data from older tool_result messages to control token usage.
    // Only the most recent N screenshots are kept; older ones become text placeholders.
    const MAX_IMAGES_IN_CONTEXT = 2;
    function pruneOldImages(msgs: typeof loopMessages): typeof loopMessages {
      let imageCount = 0;
      // Count images from newest to oldest
      const imageCounts: boolean[] = msgs.map(() => false);
      for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          for (const block of msg.content as any[]) {
            if (block.type === 'tool_result' && Array.isArray(block.content)) {
              for (const inner of block.content) {
                if (inner.type === 'image') {
                  imageCount++;
                  if (imageCount <= MAX_IMAGES_IN_CONTEXT) {
                    imageCounts[i] = true; // keep this message's images
                  }
                }
              }
            }
          }
        }
      }

      return msgs.map((msg, i) => {
        if (msg.role !== 'user' || !Array.isArray(msg.content) || imageCounts[i]) return msg;
        // Strip images from this message — replace with text placeholder
        const stripped = (msg.content as any[]).map((block: any) => {
          if (block.type === 'tool_result' && Array.isArray(block.content)) {
            return {
              ...block,
              content: block.content.map((inner: any) =>
                inner.type === 'image'
                  ? { type: 'text', text: '[Screenshot from earlier step — removed to save context]' }
                  : inner
              ),
            };
          }
          return block;
        });
        return { ...msg, content: stripped };
      });
    }

    // Call Claude with automatic retry on rate limit errors
    async function callWithRetry(msgs: any[], attempt = 0): Promise<any> {
      try {
        return await claude.sendMessage(msgs, {
          systemPrompt: agenticSystemPrompt,
          tools: tools.length > 0 ? tools : undefined,
          temperature,
          maxTokens: 4096,
        });
      } catch (err: any) {
        const isRateLimit = err.message?.includes('rate_limit_error') || err.message?.includes('rate limit');
        if (isRateLimit && attempt < 3) {
          const waitSec = (attempt + 1) * 30; // 30s, 60s, 90s
          console.log(`[Chat] ⏳ Rate limit — waiting ${waitSec}s before retry ${attempt + 1}/3`);
          reply.raw.write(`data: ${JSON.stringify({
            type: 'text',
            content: `\n\n*Rate limit reached — waiting ${waitSec}s before continuing...*\n\n`,
          })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
          return callWithRetry(msgs, attempt + 1);
        }
        throw err;
      }
    }

    // === AGENTIC LOOP ===
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`[Chat] 🔄 Agentic loop iteration ${iteration}/${MAX_ITERATIONS}`);

      const response = await callWithRetry(pruneOldImages(loopMessages) as any);

      console.log(`[Chat]   Stop reason: ${response.stopReason}`);

      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalContent = response.content;
        console.log(`[Chat] ✅ Final response after ${iteration} iterations (${finalContent.length} chars)`);
        break;
      }

      // Reset consecutive error counter when Claude makes tool calls
      consecutiveErrors = 0;

      // Claude wants to use tools
      console.log(`[Chat] 🔧 Claude requested ${response.toolCalls.length} tool(s):`);
      response.toolCalls.forEach((tc: any) =>
        console.log(`[Chat]     • ${tc.tool}(${JSON.stringify(tc.arguments).slice(0, 80)})`)
      );

      // Notify client — structured tool_start event
      reply.raw.write(`data: ${JSON.stringify({
        type: 'tool_start',
        step: iteration,
        tools: response.toolCalls.map((tc: any) => ({
          name: tc.tool,
          input: JSON.stringify(tc.arguments).slice(0, 300),
        })),
      })}\n\n`);

      // Add assistant message (with tool_use blocks) to conversation
      loopMessages.push({
        role: 'assistant',
        content: response.rawBlocks || response.content,
      });

      // Execute all tools IN PARALLEL and collect results (order preserved by Promise.all)
      const toolResults = await Promise.all(
        response.toolCalls.map(async (toolCall: any) => {
          console.log(`[Chat] ⚙️  Executing (parallel): ${toolCall.tool}`);
          try {
            const result = await toolsRegistry.execute(toolCall.tool, toolCall.arguments);

            let resultContent: any[];
            if (result.content) {
              resultContent = result.content.map((block: any) => {
                if (block.type === 'image' && block.source) {
                  // Normalize media_type: desktop.py now saves as JPEG
                  const mediaType = (block.source.media_type === 'image/jpeg' || block.source.data?.length)
                    ? 'image/jpeg'
                    : block.source.media_type;
                  return { ...block, source: { ...block.source, media_type: mediaType } };
                }
                return { type: 'text', text: block.text || JSON.stringify(block) };
              });
            } else {
              resultContent = [{ type: 'text', text: JSON.stringify(result) }];
            }

            console.log(`[Chat] ✅ Tool result: ${resultContent[0]?.text?.slice(0, 100) || '(image)'}`);
            return { type: 'tool_result', tool_use_id: toolCall.id, content: resultContent };
          } catch (err: any) {
            console.error(`[Chat] ❌ Tool error for ${toolCall.tool}:`, err.message);
            return {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: [{ type: 'text', text: `Error: ${err.message}. Try a different approach.` }],
              is_error: true,
            };
          }
        })
      );
      // Notify client — structured tool_result event
      reply.raw.write(`data: ${JSON.stringify({
        type: 'tool_result',
        step: iteration,
        results: toolResults.map((r: any, idx: number) => ({
          name: response.toolCalls[idx]?.tool ?? '',
          output: (r.content?.find((b: any) => b.type === 'text')?.text ?? '').slice(0, 500),
          isError: r.is_error === true,
        })),
      })}\n\n`);

      const stepHadError = toolResults.some((r: any) => r.is_error === true);

      if (stepHadError) {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          finalContent = `Task stopped after ${consecutiveErrors} consecutive errors. Last error prevented the tool from running. Please check if the required application is installed.`;
          break;
        }
      }

      // Add tool results as user message and continue loop
      loopMessages.push({
        role: 'user',
        content: toolResults,
      });
    }

    if (!finalContent && iteration >= MAX_ITERATIONS) {
      finalContent = `I completed ${MAX_ITERATIONS} steps on this task. The task may need more steps — please tell me to continue if needed.`;
    }

    // Auto-cleanup: always hide the desktop indicator when the task ends
    // (in case Claude forgot to call hide_indicator before giving its final reply)
    try {
      await toolsRegistry.execute('desktop_control', { action: 'hide_indicator' });
    } catch {
      // Silently ignore — indicator may already be hidden or desktop_control unavailable
    }

    // Stream final content to client in chunks
    const CHUNK_SIZE = 20;
    for (let i = 0; i < finalContent.length; i += CHUNK_SIZE) {
      const chunk = finalContent.slice(i, i + CHUNK_SIZE);
      reply.raw.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    console.log('[Chat] ✅ Agentic stream completed');

  } catch (error: any) {
    // SECURITY: Don't expose error details in SSE stream (H-09)
    console.error('[Chat] ❌ Claude error:', error);
    reply.raw.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: 'Chat request failed',
      })}\n\n`
    );
  }

  reply.raw.end();
  return reply;
}
