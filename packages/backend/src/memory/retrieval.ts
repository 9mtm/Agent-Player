/**
 * Memory Retrieval
 *
 * Handles finding relevant memories and extracting new ones from conversations.
 * Extraction uses the local model by default (R2.2, src/llm/model-call.ts);
 * a paid model provider only when the owner opted the purpose in and the
 * daily cost cap allows it.
 */

import { v4 as uuidv4 } from 'uuid';
import { getMemoryStorage } from './storage.js';
import { getDatabase } from '../db/index.js';
import { getMemoryExtractionClaudeConfig } from '../credentials/authority.js';
import { getCredentialManager } from '../credentials/manager.js';
import type {
  Memory,
  MemoryType,
  MemoryExtractionResult,
  IMemoryRetrieval,
  ImportanceLevel,
  MemoryLayer
} from './types.js';
import { backgroundPaidPurposes, modelCall } from '../llm/model-call.js';
import type { DrawerRef } from './drawers.js';

const CLAUDE_KEY_PATTERN = /^sk-ant-/;

/** Validate that an API key looks like a real Anthropic key (not masked bullets) */
function isValidClaudeKey(key: string): boolean {
  return CLAUDE_KEY_PATTERN.test(key);
}

/**
 * Claude config for memory extraction, from the credential authority (S1.1).
 * The authority keeps the historical source so no new paid calls start.
 */
function getClaudeConfig(): { apiKey: string; model: string } | null {
  const config = getMemoryExtractionClaudeConfig();
  if (!config) return null;
  if (!isValidClaudeKey(config.apiKey)) {
    console.warn('[Memory] Claude API key is not valid (does not start with sk-ant-)');
    return null;
  }
  return config;
}

/** Extraction prompt (any model) */
const EXTRACTION_PROMPT = (text: string) => `Analyze this conversation and extract important information worth remembering.
Return a JSON array (no markdown, no explanation, just valid JSON).

Each item must have:
  type: "fact" | "preference" | "task" | "skill" | "relationship" | "context" | "credential"
  content: string  (third-person description — for credentials, do NOT include the actual value)
  importance: number  (1-10)
  confidence: number  (0-1, how sure you are that this is true and meant)
  metadata: object  (for credentials: { credentialName: "...", credentialType: "api_key|token|password", value: "ACTUAL_VALUE_HERE" })

Rules:
- Extract genuinely useful, reusable facts about the USER.
- Skip generic statements, assistant responses, and small talk.
- IMPORTANT: If the user shares an API key, token, or password — use type "credential", put the actual secret in metadata.value, and write a safe description in content (e.g. "User has a GitHub API token").
- If nothing is worth remembering, return [].
- Respond with valid JSON array ONLY.

Conversation:
${text}`;

/** Parse the model's JSON array of extraction items (markdown fences tolerated). */
function parseExtractions(rawText: string): MemoryExtractionResult[] {
  const cleaned = String(rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim() || '[]';
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: any) => item && item.type && item.content);
  } catch {
    return [];
  }
}

/**
 * R2.2: extraction runs in the background (the chat UI posts each turn
 * after the reply), so it goes through the model-call choke point: the
 * local model by default; the configured paid model provider only when the
 * owner listed `memory_extraction` in BACKGROUND_PAID_PURPOSES and the
 * daily cap allows it. Q-16 (provisional): stays on local Qwen.
 */
async function extractWithModel(text: string, userId: string): Promise<MemoryExtractionResult[]> {
  const prompt = EXTRACTION_PROMPT(text);
  // The paid key is only read when the owner opted this purpose in.
  const paidConfig = backgroundPaidPurposes().has('memory_extraction') ? getClaudeConfig() : null;
  const paid = paidConfig ? { provider: 'claude' as const, model: paidConfig.model, apiKey: paidConfig.apiKey } : null;
  const ctx = { actor: userId };
  const first = await modelCall(ctx, { purpose: 'memory_extraction', prompt, maxOutputTokens: 1024, paid, timeoutMs: 60_000 });
  if (!first.ok) console.warn(`[Memory] ${first.provider} extraction failed:`, first.error);
  let extractions = first.ok ? parseExtractions(first.text) : [];
  console.log(`[Memory] ${first.provider} extracted:`, extractions.length, 'items');
  // A paid model that produced nothing: try the local model once.
  if (extractions.length === 0 && first.paid) {
    const local = await modelCall(ctx, { purpose: 'memory_extraction', prompt, maxOutputTokens: 1024, timeoutMs: 60_000 });
    extractions = local.ok ? parseExtractions(local.text) : [];
    console.log('[Memory] local extracted:', extractions.length, 'items');
  }
  return extractions;
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
    limit = 5,
    drawers?: DrawerRef[]
  ): Promise<Memory[]> {
    // CORE-03: chat recall reads only the drawers selected for the turn.
    const results = await this.storage.search({
      query,
      userId,
      limit,
      drawers
    });

    return results.map(result => result.memory);
  }

  /**
   * Extract learning candidates from conversation text using a model
   * (local by default, see extractWithModel). Works for any language.
   *
   * Nothing is saved to memory here (CORE-05: the caller classifies each
   * candidate with memory/learning.ts). A shared secret goes to the encrypted
   * credential store; only a safe reference becomes a candidate.
   */
  async extractCandidates(text: string, userId: string): Promise<Array<{
    content: string; type: string; importance: number; confidence?: number; origin: 'extraction'; credentialRef?: boolean;
  }>> {
    if (!text.trim()) return [];

    const extractions = await extractWithModel(text, userId);

    const out: Array<{ content: string; type: string; importance: number; confidence?: number; origin: 'extraction'; credentialRef?: boolean }> = [];
    const credentialManager = getCredentialManager();

    for (const extraction of extractions) {
      if (typeof extraction?.content !== 'string' || !extraction.content.trim()) continue;
      const rawConfidence = (extraction as any).confidence ?? extraction.metadata?.confidence;
      const confidence = typeof rawConfidence === 'number' && rawConfidence >= 0 && rawConfidence <= 1 ? rawConfidence : undefined;
      // Credentials go to encrypted credentials store, NOT plain memory
      if ((extraction.type as string) === 'credential') {
        if (!extraction.metadata?.value) continue;
        try {
          const credName = String(extraction.metadata.credentialName || extraction.content);
          const credType = String(extraction.metadata.credentialType || 'api_key');
          await credentialManager.create({
            name: credName,
            type: credType as any,
            value: String(extraction.metadata.value),
            description: `Auto-saved from chat: ${extraction.content}`,
            userId,
          });
          out.push({ content: `${extraction.content} (stored securely in credentials)`, type: 'fact', importance: 8, origin: 'extraction', credentialRef: true, ...(confidence !== undefined ? { confidence } : {}) });
          console.log('[Memory] Credential saved to store');
        } catch (err) {
          console.warn('[Memory] Failed to save credential:', (err as Error).message);
        }
        continue;
      }
      out.push({
        content: extraction.content,
        type: typeof extraction.type === 'string' ? extraction.type : 'fact',
        importance: Math.min(10, Math.max(1, Number(extraction.importance) || 5)),
        origin: 'extraction',
        ...(confidence !== undefined ? { confidence } : {}),
      });
    }

    console.log('[Memory] Extracted', out.length, 'candidates');
    return out;
  }

  /**
   * Extract and learn (CORE-05): routine items are saved, important ones wait
   * for owner approval. Returns the saved memories.
   */
  async extractMemories(text: string, userId: string): Promise<Memory[]> {
    const candidates = await this.extractCandidates(text, userId);
    const { learn } = await import('./learning.js');
    const outcome = await learn({ userId, candidates, actor: 'extraction', metadata: { source: 'conversation' } });
    return outcome.saved;
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
