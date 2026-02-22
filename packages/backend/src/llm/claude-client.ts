/**
 * Claude API Client
 *
 * Handles communication with Anthropic Claude API
 */

interface ClaudeMessage {
  role: 'user' | 'assistant';
  // string for text-only; array for multimodal (text + image blocks)
  content: string | any[];
}

interface ClaudeTool {
  name: string;
  description: string;
  input_schema: any;
}

export interface ClaudeResponse {
  content: string;
  rawBlocks?: any[]; // raw content blocks for agentic tool loop
  toolCalls?: Array<{
    id: string;
    tool: string;
    arguments: Record<string, any>;
  }>;
  stopReason?: string;
}

export class ClaudeClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string, model: string = 'claude-sonnet-4-5-20250929') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Send message to Claude
   */
  async sendMessage(
    messages: ClaudeMessage[],
    options?: {
      systemPrompt?: string;
      tools?: ClaudeTool[];
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<ClaudeResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || 1024,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ...(options?.systemPrompt && { system: options.systemPrompt }),
        ...(options?.tools && options.tools.length > 0 && { tools: options.tools }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();

    // Parse response
    const result: ClaudeResponse = {
      content: '',
      stopReason: data.stop_reason,
      rawBlocks: data.content, // keep raw blocks for agentic loop
    };

    // Extract text content
    const textBlocks = data.content.filter((block: any) => block.type === 'text');
    result.content = textBlocks.map((block: any) => block.text).join('\n');

    // Extract tool calls (include id for tool_result responses)
    const toolUseBlocks = data.content.filter((block: any) => block.type === 'tool_use');
    if (toolUseBlocks.length > 0) {
      result.toolCalls = toolUseBlocks.map((block: any) => ({
        id: block.id,
        tool: block.name,
        arguments: block.input,
      }));
    }

    return result;
  }

  /**
   * Stream message from Claude
   */
  async *streamMessage(
    messages: ClaudeMessage[],
    options?: {
      systemPrompt?: string;
      tools?: ClaudeTool[];
      maxTokens?: number;
      temperature?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || 1024,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        ...(options?.systemPrompt && { system: options.systemPrompt }),
        ...(options?.tools && options.tools.length > 0 && { tools: options.tools }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6); // Remove 'data: ' prefix
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta') {
              if (parsed.delta?.type === 'text_delta') {
                yield parsed.delta.text;
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
