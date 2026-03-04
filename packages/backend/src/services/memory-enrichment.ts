/**
 * Memory Enrichment Service
 *
 * Automatically enhances memories with:
 * - Auto-generated tags
 * - Emotion detection
 * - Topic categorization
 * - Related memory suggestions
 */

import { getDatabase } from '../db/index.js';
import { MemoryQualityScorer } from './memory-quality-scorer.js';

export interface EnrichmentResult {
    memoryId: string;
    enrichments: {
        tags?: string[];
        emotions?: string[];
        category?: string;
        relatedMemories?: string[];
    };
    qualityImprovement: number;
    confidence: number;
}

export class MemoryEnrichmentService {
    /**
     * Enrich a memory with auto-generated metadata
     */
    static async enrichMemory(memoryId: string, content: string, existingMetadata?: any): Promise<EnrichmentResult> {
        const db = getDatabase();

        // Get old quality score
        const oldMemory = db.prepare('SELECT quality_score FROM memories WHERE id = ?').get(memoryId) as any;
        const oldQuality = oldMemory?.quality_score || 50;

        const enrichments: EnrichmentResult['enrichments'] = {};
        let totalConfidence = 0;
        let enrichmentCount = 0;

        // Auto-generate tags
        const tags = this.extractTags(content);
        if (tags.length > 0) {
            enrichments.tags = tags;
            totalConfidence += 0.8;
            enrichmentCount++;
            await this.logEnrichment(memoryId, 'tags', null, JSON.stringify(tags), 0.8);
        }

        // Detect emotions
        const emotions = this.detectEmotions(content);
        if (emotions.length > 0) {
            enrichments.emotions = emotions;
            totalConfidence += 0.7;
            enrichmentCount++;
            await this.logEnrichment(memoryId, 'emotions', null, JSON.stringify(emotions), 0.7);
        }

        // Categorize by topic
        const category = this.categorizeContent(content);
        if (category) {
            enrichments.category = category;
            totalConfidence += 0.75;
            enrichmentCount++;
        }

        // Find related memories
        const relatedMemories = await this.findRelatedMemories(memoryId, content);
        if (relatedMemories.length > 0) {
            enrichments.relatedMemories = relatedMemories;
            totalConfidence += 0.6;
            enrichmentCount++;
            await this.logEnrichment(memoryId, 'relationships', null, JSON.stringify(relatedMemories), 0.6);
        }

        // Update memory with enrichments
        const updatedMetadata = {
            ...(existingMetadata || {}),
            ...enrichments
        };

        db.prepare(`
            UPDATE memories
            SET metadata = ?,
                tags = ?,
                emotions = ?,
                related_memory_ids = ?,
                auto_enriched = 1,
                enriched_at = datetime('now')
            WHERE id = ?
        `).run(
            JSON.stringify(updatedMetadata),
            enrichments.tags ? JSON.stringify(enrichments.tags) : null,
            enrichments.emotions ? JSON.stringify(enrichments.emotions) : null,
            enrichments.relatedMemories ? JSON.stringify(enrichments.relatedMemories) : null,
            memoryId
        );

        // Re-calculate quality score
        const newScores = await MemoryQualityScorer.scoreMemory(memoryId, content, updatedMetadata);
        await MemoryQualityScorer.updateMemoryQuality(memoryId, newScores);

        const confidence = enrichmentCount > 0 ? totalConfidence / enrichmentCount : 0;

        return {
            memoryId,
            enrichments,
            qualityImprovement: newScores.overall - oldQuality,
            confidence
        };
    }

    /**
     * Extract tags from content using keyword extraction
     */
    private static extractTags(content: string): string[] {
        const tags: string[] = [];

        // Technical keywords
        const techKeywords = [
            'javascript', 'typescript', 'python', 'react', 'node', 'api', 'database',
            'sql', 'frontend', 'backend', 'deployment', 'testing', 'bug', 'feature',
            'optimization', 'security', 'authentication', 'authorization'
        ];

        // Action keywords
        const actionKeywords = [
            'learn', 'build', 'fix', 'improve', 'implement', 'deploy', 'test',
            'debug', 'refactor', 'optimize', 'research', 'design'
        ];

        // Domain keywords
        const domainKeywords = [
            'meeting', 'project', 'task', 'deadline', 'goal', 'plan', 'decision',
            'problem', 'solution', 'idea', 'insight', 'lesson', 'success', 'failure'
        ];

        const allKeywords = [...techKeywords, ...actionKeywords, ...domainKeywords];
        const contentLower = content.toLowerCase();

        // Extract matching keywords
        for (const keyword of allKeywords) {
            if (contentLower.includes(keyword) && !tags.includes(keyword)) {
                tags.push(keyword);
            }
        }

        // Extract capitalized words (likely important nouns)
        const capitalizedWords = content.match(/\b[A-Z][a-z]{3,}\b/g) || [];
        for (const word of capitalizedWords) {
            if (!tags.includes(word.toLowerCase()) && tags.length < 10) {
                tags.push(word.toLowerCase());
            }
        }

        return tags.slice(0, 8); // Max 8 tags
    }

    /**
     * Detect emotions from content
     */
    private static detectEmotions(content: string): string[] {
        const emotions: string[] = [];
        const contentLower = content.toLowerCase();

        // Positive emotions
        if (contentLower.match(/\b(happy|joy|excited|great|awesome|success|win|achieve)\b/)) {
            emotions.push('positive');
        }
        if (contentLower.match(/\b(confident|proud|satisfied|pleased)\b/)) {
            emotions.push('confident');
        }

        // Negative emotions
        if (contentLower.match(/\b(sad|disappointed|frustrated|angry|upset|fail)\b/)) {
            emotions.push('negative');
        }
        if (contentLower.match(/\b(worried|anxious|concerned|uncertain|doubt)\b/)) {
            emotions.push('anxious');
        }

        // Neutral/Cognitive
        if (contentLower.match(/\b(interesting|curious|wonder|think|consider|note)\b/)) {
            emotions.push('curious');
        }
        if (contentLower.match(/\b(important|critical|urgent|must|need)\b/)) {
            emotions.push('urgent');
        }

        // Default to neutral if no emotions detected
        if (emotions.length === 0) {
            emotions.push('neutral');
        }

        return emotions;
    }

    /**
     * Categorize content by topic
     */
    private static categorizeContent(content: string): string | null {
        const contentLower = content.toLowerCase();

        // Technical categories
        if (contentLower.match(/\b(code|programming|development|software|api|database)\b/)) {
            return 'technical';
        }

        // Business categories
        if (contentLower.match(/\b(meeting|project|deadline|task|goal|plan|decision)\b/)) {
            return 'business';
        }

        // Learning categories
        if (contentLower.match(/\b(learn|study|research|understand|lesson|insight)\b/)) {
            return 'learning';
        }

        // Personal categories
        if (contentLower.match(/\b(feel|think|believe|prefer|like|dislike)\b/)) {
            return 'personal';
        }

        // Problem-solving categories
        if (contentLower.match(/\b(problem|issue|bug|error|fix|solution|solve)\b/)) {
            return 'problem-solving';
        }

        return null;
    }

    /**
     * Find related memories using content similarity
     */
    private static async findRelatedMemories(memoryId: string, content: string, limit = 5): Promise<string[]> {
        const db = getDatabase();

        // Get memories from same user
        const memory = db.prepare('SELECT user_id, type FROM memories WHERE id = ?').get(memoryId) as any;
        if (!memory) return [];

        // Simple keyword-based similarity (in production, use vector similarity)
        const keywords = this.extractKeywords(content);
        if (keywords.length === 0) return [];

        const relatedMemories: string[] = [];

        // Search for memories with similar keywords
        const candidates = db.prepare(`
            SELECT id, content, type
            FROM memories
            WHERE user_id = ? AND id != ? AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 50
        `).all(memory.user_id, memoryId) as any[];

        for (const candidate of candidates) {
            const candidateKeywords = this.extractKeywords(candidate.content);
            const commonKeywords = keywords.filter(k => candidateKeywords.includes(k));

            // If they share 2+ keywords, consider them related
            if (commonKeywords.length >= 2) {
                relatedMemories.push(candidate.id);

                // Create relationship entry
                await this.createRelationship(memoryId, candidate.id, 'related', commonKeywords.length / keywords.length);

                if (relatedMemories.length >= limit) break;
            }
        }

        return relatedMemories;
    }

    /**
     * Extract important keywords from text
     */
    private static extractKeywords(text: string): string[] {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);

        // Remove common stop words
        const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'about', 'when', 'where', 'which', 'what', 'there', 'their', 'these', 'those']);
        return words.filter(w => !stopWords.has(w)).slice(0, 10);
    }

    /**
     * Create a memory relationship
     */
    private static async createRelationship(
        sourceId: string,
        targetId: string,
        type: string,
        strength: number
    ): Promise<void> {
        const db = getDatabase();
        const relationshipId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            db.prepare(`
                INSERT OR IGNORE INTO memory_relationships (id, source_memory_id, target_memory_id, relationship_type, strength, auto_detected)
                VALUES (?, ?, ?, ?, ?, 1)
            `).run(relationshipId, sourceId, targetId, type, strength);
        } catch (err) {
            // Ignore duplicate relationship errors
        }
    }

    /**
     * Log an enrichment operation
     */
    private static async logEnrichment(
        memoryId: string,
        type: string,
        beforeValue: string | null,
        afterValue: string,
        confidence: number
    ): Promise<void> {
        const db = getDatabase();
        const logId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        db.prepare(`
            INSERT INTO memory_enrichment_log (id, memory_id, enrichment_type, before_value, after_value, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(logId, memoryId, type, beforeValue, afterValue, confidence);
    }

    /**
     * Batch enrich multiple memories
     */
    static async batchEnrich(userId: string, limit = 10): Promise<EnrichmentResult[]> {
        const db = getDatabase();

        // Get memories that haven't been enriched yet or have low quality
        const memories = db.prepare(`
            SELECT id, content, metadata
            FROM memories
            WHERE user_id = ?
              AND status = 'active'
              AND (auto_enriched = 0 OR quality_score < 60)
            ORDER BY created_at DESC
            LIMIT ?
        `).all(userId, limit) as any[];

        const results: EnrichmentResult[] = [];

        for (const memory of memories) {
            try {
                const metadata = memory.metadata ? JSON.parse(memory.metadata) : {};
                const result = await this.enrichMemory(memory.id, memory.content, metadata);
                results.push(result);
            } catch (err) {
                console.error(`Failed to enrich memory ${memory.id}:`, err);
            }
        }

        return results;
    }
}
