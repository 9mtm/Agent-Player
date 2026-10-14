/**
 * Memory Deduplication Service
 *
 * Detects and merges duplicate or similar memories across agents
 * Prevents redundant storage and consolidates shared knowledge
 *
 * Based on research: Memory in LLM-based Multi-agent Systems
 * https://www.techrxiv.org/users/1007269/articles/1367390
 */

import { all, run, sql } from '../repositories/sql-steps.js';
import { textTimestamp } from '../db/pg/dialect.js';
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
export async function findSimilarMemories(
    userId: string,
    similarityThreshold: number = 0.85
): Promise<SimilarMemory[][]> {
    // Get all active memories for this user
    const memories = await sql().read(all<SimilarMemory>(`
        SELECT id, content, source_agent_id, importance_score, access_count, created_at
        FROM memories
        WHERE user_id = ?
        AND status = 'active'
        ORDER BY created_at DESC, id DESC
    `, userId));

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
export async function mergeSimilarMemories(
    userId: string,
    memoryIds: string[]
): Promise<string | null> {
    if (memoryIds.length < 2) {
        return null; // Nothing to merge
    }

    // One transaction: the kept row is updated and the others deleted together.
    return sql().tx(function* () {
        // Get all memories (this user's only)
        const memories = yield* all(`
            SELECT *
            FROM memories
            WHERE id IN (${memoryIds.map(() => '?').join(',')})
            AND user_id = ?
            ORDER BY id
        `, ...memoryIds, userId);

        if (memories.length === 0) return null;

        // Find the "best" memory to keep (highest importance + access count)
        const bestMemory = memories.reduce((best, current) => {
            const bestScore = (best.importance_score || 0) * 0.5 + (best.access_count || 0) * 0.5;
            const currentScore = (current.importance_score || 0) * 0.5 + (current.access_count || 0) * 0.5;
            return currentScore > bestScore ? current : best;
        });

        // Merge metadata from all memories
        const totalAccessCount = memories.reduce((sum, m) => sum + (m.access_count || 0), 0);
        const avgImportance = memories.reduce((sum, m) => sum + (m.importance_score || 0.5), 0) / memories.length;

        // Was json_set(metadata, '$.merged_from', json(?), '$.merge_timestamp', datetime('now'))
        // (SQLite only): the same keys set in JS, the time in the same text format.
        let metadata: Record<string, unknown> = {};
        try {
            const parsed = bestMemory.metadata ? JSON.parse(bestMemory.metadata) : {};
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) metadata = parsed;
        } catch { /* unreadable metadata: start again */ }
        metadata.merged_from = memoryIds.filter(id => id !== bestMemory.id);
        metadata.merge_timestamp = textTimestamp(Date.now());

        // Update the best memory with merged data
        yield* run(`
            UPDATE memories
            SET
                access_count = ?,
                importance_score = ?,
                metadata = ?
            WHERE id = ? AND user_id = ?
        `,
            totalAccessCount,
            avgImportance,
            JSON.stringify(metadata),
            bestMemory.id,
            userId
        );

        // Delete the duplicate memories
        const duplicateIds = memoryIds.filter(id => id !== bestMemory.id);
        if (duplicateIds.length > 0) {
            yield* run(`
                DELETE FROM memories
                WHERE id IN (${duplicateIds.map(() => '?').join(',')}) AND user_id = ?
            `, ...duplicateIds, userId);
        }

        return bestMemory.id as string;
    });
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

    const similarGroups = await findSimilarMemories(userId, similarityThreshold);

    let memoriesMerged = 0;
    let memoriesDeleted = 0;

    for (const group of similarGroups) {
        const memoryIds = group.map(m => m.id);
        const mergedId = await mergeSimilarMemories(userId, memoryIds);

        if (mergedId) {
            memoriesMerged++;
            memoriesDeleted += memoryIds.length - 1; // All except the kept one
        }
    }

    const durationMs = Date.now() - startTime;

    // Log the deduplication run
    await sql().read(run(`
        INSERT INTO memory_deduplication_log (
            id, run_timestamp, duplicates_found, memories_merged,
            memories_deleted, duration_ms, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
        uuidv4(),
        Date.now(),
        similarGroups.length,
        memoriesMerged,
        memoriesDeleted,
        durationMs,
        'success'
    ));

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
export async function getDeduplicationStats(userId: string) {
    // Get total memories
    const totalMemories = (await sql().read(all<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM memories
        WHERE user_id = ? AND status = 'active'
    `, userId)))[0] ?? { count: 0 };

    // Get recent deduplication logs
    const recentLogs = await sql().read(all(`
        SELECT *
        FROM memory_deduplication_log
        ORDER BY run_timestamp DESC, id
        LIMIT 10
    `));

    // Calculate potential duplicates
    const similarGroups = await findSimilarMemories(userId, 0.85);
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

        await sql().read(run(`
            INSERT INTO memory_deduplication_log (
                id, run_timestamp, status, error_message
            ) VALUES (?, ?, ?, ?)
        `, uuidv4(), Date.now(), 'failed', error.message));

        throw error;
    }
}
