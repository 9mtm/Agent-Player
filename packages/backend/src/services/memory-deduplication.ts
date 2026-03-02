/**
 * Memory Deduplication Service
 *
 * Detects and merges duplicate or similar memories across agents
 * Prevents redundant storage and consolidates shared knowledge
 *
 * Based on research: Memory in LLM-based Multi-agent Systems
 * https://www.techrxiv.org/users/1007269/articles/1367390
 */

import { getDatabase } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

interface DuplicationResult {
    duplicatesFound: number;
    memoriesMerged: number;
    memoriesDeleted: number;
    durationMs: number;
}

interface SimilarMemory {
    id: string;
    content: string;
    source_agent_id: string;
    importance_score: number;
    access_count: number;
    created_at: string;
}

/**
 * Find similar memories using simple text similarity
 * (Can be enhanced with embedding similarity later)
 */
function calculateSimilarity(content1: string, content2: string): number {
    // Normalize texts
    const norm1 = content1.toLowerCase().trim();
    const norm2 = content2.toLowerCase().trim();

    // Exact match
    if (norm1 === norm2) return 1.0;

    // Split into words
    const words1 = new Set(norm1.split(/\s+/));
    const words2 = new Set(norm2.split(/\s+/));

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    const similarity = intersection.size / union.size;

    // Length difference penalty
    const lengthRatio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);

    return similarity * lengthRatio;
}

/**
 * Find duplicate or similar memories
 * Returns groups of similar memories
 */
export function findSimilarMemories(
    userId: string,
    similarityThreshold: number = 0.85
): SimilarMemory[][] {
    const db = getDatabase();

    // Get all active memories for this user
    const memories = db.prepare(`
        SELECT id, content, source_agent_id, importance_score, access_count, created_at
        FROM memories
        WHERE user_id = ?
        AND status = 'active'
        ORDER BY created_at DESC
    `).all(userId) as SimilarMemory[];

    const groups: SimilarMemory[][] = [];
    const processed = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
        if (processed.has(memories[i].id)) continue;

        const group: SimilarMemory[] = [memories[i]];
        processed.add(memories[i].id);

        for (let j = i + 1; j < memories.length; j++) {
            if (processed.has(memories[j].id)) continue;

            const similarity = calculateSimilarity(
                memories[i].content,
                memories[j].content
            );

            if (similarity >= similarityThreshold) {
                group.push(memories[j]);
                processed.add(memories[j].id);
            }
        }

        // Only include groups with 2+ memories
        if (group.length > 1) {
            groups.push(group);
        }
    }

    return groups;
}

/**
 * Merge similar memories into a single consolidated memory
 * Keeps the most important/accessed one, deletes the rest
 */
export function mergeSimilarMemories(
    userId: string,
    memoryIds: string[]
): string | null {
    const db = getDatabase();

    if (memoryIds.length < 2) {
        return null; // Nothing to merge
    }

    // Get all memories
    const memories = db.prepare(`
        SELECT *
        FROM memories
        WHERE id IN (${memoryIds.map(() => '?').join(',')})
        AND user_id = ?
    `).all(...memoryIds, userId) as any[];

    if (memories.length === 0) return null;

    // Find the "best" memory to keep (highest importance + access count)
    const bestMemory = memories.reduce((best, current) => {
        const bestScore = (best.importance_score || 0) * 0.5 + (best.access_count || 0) * 0.5;
        const currentScore = (current.importance_score || 0) * 0.5 + (current.access_count || 0) * 0.5;
        return currentScore > bestScore ? current : best;
    });

    // Merge metadata from all memories
    const allAgents = [...new Set(memories.map(m => m.source_agent_id).filter(Boolean))];
    const totalAccessCount = memories.reduce((sum, m) => sum + (m.access_count || 0), 0);
    const avgImportance = memories.reduce((sum, m) => sum + (m.importance_score || 0.5), 0) / memories.length;

    // Update the best memory with merged data
    db.prepare(`
        UPDATE memories
        SET
            access_count = ?,
            importance_score = ?,
            metadata = json_set(
                COALESCE(metadata, '{}'),
                '$.merged_from',
                json(?),
                '$.merge_timestamp',
                datetime('now')
            )
        WHERE id = ?
    `).run(
        totalAccessCount,
        avgImportance,
        JSON.stringify(memoryIds.filter(id => id !== bestMemory.id)),
        bestMemory.id
    );

    // Delete the duplicate memories
    const duplicateIds = memoryIds.filter(id => id !== bestMemory.id);
    if (duplicateIds.length > 0) {
        db.prepare(`
            DELETE FROM memories
            WHERE id IN (${duplicateIds.map(() => '?').join(',')})
        `).run(...duplicateIds);
    }

    return bestMemory.id;
}

/**
 * Run full deduplication process
 * Finds and merges similar memories
 */
export async function runDeduplication(
    userId: string,
    similarityThreshold: number = 0.85
): Promise<DuplicationResult> {
    const startTime = Date.now();
    const db = getDatabase();

    const similarGroups = findSimilarMemories(userId, similarityThreshold);

    let memoriesMerged = 0;
    let memoriesDeleted = 0;

    for (const group of similarGroups) {
        const memoryIds = group.map(m => m.id);
        const mergedId = mergeSimilarMemories(userId, memoryIds);

        if (mergedId) {
            memoriesMerged++;
            memoriesDeleted += memoryIds.length - 1; // All except the kept one
        }
    }

    const durationMs = Date.now() - startTime;

    // Log the deduplication run
    db.prepare(`
        INSERT INTO memory_deduplication_log (
            id, run_timestamp, duplicates_found, memories_merged,
            memories_deleted, duration_ms, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
        Date.now(),
        similarGroups.length,
        memoriesMerged,
        memoriesDeleted,
        durationMs,
        'success'
    );

    return {
        duplicatesFound: similarGroups.length,
        memoriesMerged,
        memoriesDeleted,
        durationMs,
    };
}

/**
 * Get deduplication statistics
 */
export function getDeduplicationStats(userId: string) {
    const db = getDatabase();

    // Get total memories
    const totalMemories = db.prepare(`
        SELECT COUNT(*) as count
        FROM memories
        WHERE user_id = ? AND status = 'active'
    `).get(userId) as { count: number };

    // Get recent deduplication logs
    const recentLogs = db.prepare(`
        SELECT *
        FROM memory_deduplication_log
        ORDER BY run_timestamp DESC
        LIMIT 10
    `).all() as any[];

    // Calculate potential duplicates
    const similarGroups = findSimilarMemories(userId, 0.85);
    const potentialDuplicates = similarGroups.reduce((sum, group) => sum + (group.length - 1), 0);

    return {
        totalMemories: totalMemories.count,
        potentialDuplicates,
        recentRuns: recentLogs,
    };
}

/**
 * Schedule weekly deduplication
 * Should be called by the scheduler
 */
export async function scheduledDeduplication(userId: string) {
    try {
        const result = await runDeduplication(userId, 0.85);
        console.log(`[Memory Deduplication] User ${userId}: ${result.memoriesMerged} memories merged, ${result.memoriesDeleted} deleted in ${result.durationMs}ms`);
        return result;
    } catch (error: any) {
        console.error(`[Memory Deduplication] Error for user ${userId}:`, error);

        const db = getDatabase();
        db.prepare(`
            INSERT INTO memory_deduplication_log (
                id, run_timestamp, status, error_message
            ) VALUES (?, ?, ?, ?)
        `).run(uuidv4(), Date.now(), 'failed', error.message);

        throw error;
    }
}
