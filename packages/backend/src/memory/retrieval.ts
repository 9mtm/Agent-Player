/**
 * Memory Retrieval
 *
 * Handles finding relevant memories and extracting new ones from conversations.
 * Uses Claude AI for intelligent extraction (any language, any content type).
 * Falls back to Ollama when no Claude key is configured.
 */

import { v4 as uuidv4 } from 'uuid';
import { getMemoryStorage } from './storage.js';
import { getDatabase } from '../db/index.js';
import { decrypt, isEncrypted } from '../settings/encryption.js';
import { getCredentialManager } from '../credentials/manager.js';
import type {
  Memory,
  MemoryType,
  MemoryExtractionResult,
  IMemoryRetrieval,
  ImportanceLevel,
  MemoryLayer
} from './types.js';

const CLAUDE_KEY_PATTERN = /^sk-ant-/;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = process.env.DEFAULT_MODEL || process.env.LOCAL_MODEL_NAME || 'qwen2.5:7b';

/** Validate that an API key looks like a real Anthropic key (not masked bullets) */
function isValidClaudeKey(key: string): boolean {
  return CLAUDE_KEY_PATTERN.test(key);
}

/** Get Claude API config from the agent_settings stored in SQLite */
function getClaudeConfig(): { apiKey: string; model: string } | null {
  try {
    const db = getDatabase();

    // Read agent_settings from settings table
    const row = db.prepare(
      "SELECT value FROM settings WHERE key = 'agent_settings' LIMIT 1"
    ).get() as any;

    if (!row?.value) return null;

    const settings = JSON.parse(row.value);
    let apiKey: string = settings?.claude?.apiKey || '';
    const model: string = settings?.claude?.model || 'claude-haiku-4-5-20251001';

    if (!apiKey) return null;

    // Decrypt if stored encrypted
    if (isEncrypted(apiKey)) {
      try {
        apiKey = decrypt(apiKey);
      } catch {
        console.warn('[Memory] Could not decrypt Claude API key — ENCRYPTION_KEY may differ');
        return null;
      }
    }

    if (!isValidClaudeKey(apiKey)) {
      console.warn('[Memory] Claude API key is not valid (does not start with sk-ant-)');
      return null;
    }

    return { apiKey, model };
  } catch (err) {
    console.warn('[Memory] Failed to read Claude config:', (err as Error).message);
    return null;
  }
}

/** Call Claude to extract memories from conversation text */
const EXTRACTION_PROMPT = (text: string) => `Analyze this conversation and extract important information worth remembering.
Return a JSON array (no markdown, no explanation, just valid JSON).

Each item must have:
  type: "fact" | "preference" | "task" | "skill" | "relationship" | "context" | "credential"
  content: string  (third-person description — for credentials, do NOT include the actual value)
  importance: number  (1-10)
  metadata: object  (for credentials: { credentialName: "...", credentialType: "api_key|token|password", value: "ACTUAL_VALUE_HERE" })

Rules:
- Extract genuinely useful, reusable facts about the USER.
- Skip generic statements, assistant responses, and small talk.
- IMPORTANT: If the user shares an API key, token, or password — use type "credential", put the actual secret in metadata.value, and write a safe description in content (e.g. "User has a GitHub API token").
- If nothing is worth remembering, return [].
- Respond with valid JSON array ONLY.

Conversation:
${text}`;

async function extractWithClaude(
  text: string,
  apiKey: string,
  model: string
): Promise<MemoryExtractionResult[]> {
  const prompt = EXTRACTION_PROMPT(text);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn('[Memory] Claude API error:', res.status, errText.slice(0, 200));
    return [];
  }

  const data = await res.json() as any;
  const rawText = data.content?.[0]?.text?.trim() || '[]';

  try {
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: any) => item.type && item.content);
  } catch {
    return [];
  }
}

/** Call Ollama to extract memories — fallback when no Claude key is available */
async function extractWithOllama(text: string): Promise<MemoryExtractionResult[]> {
  const prompt = EXTRACTION_PROMPT(text);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),  // 60s — LLM can be slow on CPU
    });

    if (!res.ok) {
      console.warn('[Memory] Ollama API error:', res.status);
      return [];
    }

    const data = await res.json() as any;
    const rawText = (data.response || '').trim();

    // Strip markdown fences if model wrapped response
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item: any) => item.type && item.content);
    } catch {
      return [];
    }
  } catch (err) {
    console.warn('[Memory] Ollama extraction error:', (err as Error).message);
    return [];
  }
}

export class MemoryRetrieval implements IMemoryRetrieval {
  private storage: ReturnType<typeof getMemoryStorage>;

  constructor() {
    this.storage = getMemoryStorage();
  }

  /**
   * Find relevant memories for a query
   */
  async findRelevant(
    query: string,
    userId: string,
    limit = 5
  ): Promise<Memory[]> {
    const results = await this.storage.search({
      query,
      userId,
      limit
    });

    return results.map(result => result.memory);
  }

  /**
   * Extract memories from conversation text using AI.
   * Tries Claude first, falls back to Ollama.
   * Works for any language (Arabic, English, German, etc.).
   */
  async extractMemories(text: string, userId: string): Promise<Memory[]> {
    if (!text.trim()) return [];

    let extractions: MemoryExtractionResult[] = [];

    // Try Claude first
    const claudeConfig = getClaudeConfig();
    if (claudeConfig) {
      console.log('[Memory] Extracting via Claude...');
      try {
        extractions = await extractWithClaude(text, claudeConfig.apiKey, claudeConfig.model);
        console.log('[Memory] Claude extracted:', extractions.length, 'items');
      } catch (err) {
        console.warn('[Memory] Claude extraction failed:', (err as Error).message);
      }
    } else {
      console.log('[Memory] No valid Claude key found');
    }

    // Fallback to Ollama if Claude produced no results
    if (extractions.length === 0) {
      console.log('[Memory] Trying Ollama extraction...');
      try {
        extractions = await extractWithOllama(text);
        console.log('[Memory] Ollama extracted:', extractions.length, 'items');
      } catch (err) {
        console.warn('[Memory] Ollama extraction failed:', (err as Error).message);
      }
    }

    if (extractions.length === 0) {
      console.log('[Memory] No memories extracted from conversation');
      return [];
    }

    const memories: Memory[] = [];
    const credentialManager = getCredentialManager();

    for (const extraction of extractions) {
      // Credentials go to encrypted credentials store, NOT plain memory
      if ((extraction.type as string) === 'credential' && extraction.metadata?.value) {
        try {
          const credName = String(extraction.metadata.credentialName || extraction.content);
          const credType = String(extraction.metadata.credentialType || 'api_key');

          // Save to credentials store (encrypted)
          await credentialManager.create({
            name: credName,
            type: credType as any,
            value: String(extraction.metadata.value),
            description: `Auto-saved from chat: ${extraction.content}`,
            userId,
          });

          // Save a safe memory reference (no actual value)
          const refMemory: Memory = {
            id: uuidv4(),
            userId,
            type: 'fact' as MemoryType,
            content: `${extraction.content} (stored securely in credentials)`,
            metadata: { source: 'conversation', credentialName: credName, isCredentialRef: true },
            importance: 8 as ImportanceLevel,
            layer: 'session' as MemoryLayer,
            status: 'active',
            createdAt: new Date(),
            accessCount: 0,
          };
          await this.storage.save(refMemory);
          memories.push(refMemory);

          console.log('[Memory] 🔐 Credential saved to store:', credName);
        } catch (err) {
          console.warn('[Memory] Failed to save credential:', (err as Error).message);
        }
        continue;
      }

      // Regular memory
      const memory: Memory = {
        id: uuidv4(),
        userId,
        type: (extraction.type as MemoryType) || 'fact',
        content: extraction.content,
        metadata: extraction.metadata || { source: 'conversation' },
        importance: Math.min(10, Math.max(1, extraction.importance || 5)) as ImportanceLevel,
        layer: 'session' as MemoryLayer,
        status: 'active',
        createdAt: new Date(),
        accessCount: 0,
      };

      await this.storage.save(memory);
      memories.push(memory);
    }

    console.log('[Memory] Saved', memories.length, 'items for user:', userId);
    return memories;
  }

  /**
   * Get memory summary for a user
   */
  async getSummary(userId: string): Promise<{
    facts: Memory[];
    preferences: Memory[];
    tasks: Memory[];
    totalCount: number;
  }> {
    const allMemories = await this.storage.getByUser(userId);

    return {
      facts: allMemories.filter(m => m.type === 'fact'),
      preferences: allMemories.filter(m => m.type === 'preference'),
      tasks: allMemories.filter(m => m.type === 'task'),
      totalCount: allMemories.length
    };
  }

  /**
   * Consolidate similar memories (merge duplicates)
   */
  async consolidate(userId: string): Promise<number> {
    const memories = await this.storage.getByUser(userId);
    let consolidated = 0;

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const similarity = await this.calculateSimilarity(
          memories[i],
          memories[j]
        );

        if (similarity > 0.9) {
          // Very similar - keep the more important one
          const toKeep = memories[i].importance >= memories[j].importance ? i : j;
          const toDelete = toKeep === i ? j : i;

          await this.storage.delete(memories[toDelete].id);
          consolidated++;
        }
      }
    }

    return consolidated;
  }

  /**
   * Calculate similarity between two memories
   */
  private async calculateSimilarity(
    memory1: Memory,
    memory2: Memory
  ): Promise<number> {
    if (!memory1.embedding || !memory2.embedding) return 0;

    const storage = getMemoryStorage();
    const embeddingService = (storage as any).embeddingService;
    return embeddingService.similarity(memory1.embedding, memory2.embedding);
  }
}

// Singleton instance
let memoryRetrieval: MemoryRetrieval | null = null;

export function getMemoryRetrieval(): MemoryRetrieval {
  if (!memoryRetrieval) {
    memoryRetrieval = new MemoryRetrieval();
  }
  return memoryRetrieval;
}
