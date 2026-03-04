/**
 * Memory Quality Scorer
 *
 * Evaluates memory quality based on multiple dimensions:
 * - Completeness: Does it have enough information?
 * - Clarity: Is it well-written and understandable?
 * - Usefulness: Will it be helpful in the future?
 * - Context richness: Does it include situational context?
 */

import { getDatabase } from '../db/index.js';

export interface QualityScores {
    overall: number;           // 0-100
    completeness: number;      // 0-1
    clarity: number;           // 0-1
    usefulness: number;        // 0-1
    contextRichness: number;   // 0-1
}

export interface QualityAnalysis extends QualityScores {
    needsImprovement: boolean;
    suggestions: string[];
    strengths: string[];
}

export class MemoryQualityScorer {
    /**
     * Score a memory's quality
     */
    static async scoreMemory(memoryId: string, content: string, metadata?: any): Promise<QualityScores> {
        const completeness = this.scoreCompleteness(content, metadata);
        const clarity = this.scoreClarity(content);
        const usefulness = this.scoreUsefulness(content, metadata);
        const contextRichness = this.scoreContextRichness(metadata);

        // Weighted average for overall score
        const overall = (
            completeness * 0.3 +
            clarity * 0.25 +
            usefulness * 0.25 +
            contextRichness * 0.2
        ) * 100;

        return {
            overall: Math.round(overall * 10) / 10, // Round to 1 decimal
            completeness,
            clarity,
            usefulness,
            contextRichness
        };
    }

    /**
     * Analyze memory quality with suggestions
     */
    static async analyzeQuality(memoryId: string, content: string, metadata?: any): Promise<QualityAnalysis> {
        const scores = await this.scoreMemory(memoryId, content, metadata);
        const suggestions: string[] = [];
        const strengths: string[] = [];

        // Completeness analysis
        if (scores.completeness < 0.5) {
            suggestions.push('Add more details and context');
            if (!metadata?.context) suggestions.push('Include situational context');
            if (!metadata?.outcomes) suggestions.push('Document outcomes or lessons learned');
        } else if (scores.completeness >= 0.7) {
            strengths.push('Well-detailed content');
        }

        // Clarity analysis
        if (scores.clarity < 0.5) {
            suggestions.push('Improve writing clarity and structure');
            if (content.length < 50) suggestions.push('Expand with more information');
        } else if (scores.clarity >= 0.7) {
            strengths.push('Clear and well-written');
        }

        // Usefulness analysis
        if (scores.usefulness < 0.5) {
            suggestions.push('Add actionable insights or practical information');
        } else if (scores.usefulness >= 0.7) {
            strengths.push('Contains useful information');
        }

        // Context richness analysis
        if (scores.contextRichness < 0.5) {
            suggestions.push('Add emotional or situational context');
            if (!metadata?.tags || metadata.tags.length === 0) suggestions.push('Add relevant tags');
        } else if (scores.contextRichness >= 0.7) {
            strengths.push('Rich contextual information');
        }

        return {
            ...scores,
            needsImprovement: scores.overall < 60,
            suggestions,
            strengths
        };
    }

    /**
     * Update memory quality scores in database
     */
    static async updateMemoryQuality(memoryId: string, scores: QualityScores): Promise<void> {
        const db = getDatabase();

        // Get old quality score for history
        const oldMemory = db.prepare('SELECT quality_score FROM memories WHERE id = ?').get(memoryId) as any;
        const oldQualityScore = oldMemory?.quality_score || 50;

        // Update memory with new scores
        db.prepare(`
            UPDATE memories
            SET quality_score = ?,
                completeness_score = ?,
                clarity_score = ?,
                usefulness_score = ?,
                needs_improvement = ?
            WHERE id = ?
        `).run(
            scores.overall,
            scores.completeness,
            scores.clarity,
            scores.usefulness,
            scores.overall < 60 ? 1 : 0,
            memoryId
        );

        // Log quality history if score changed significantly
        if (Math.abs(scores.overall - oldQualityScore) > 5) {
            const historyId = `qh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            db.prepare(`
                INSERT INTO memory_quality_history (id, memory_id, old_quality_score, new_quality_score, improvement_type, changes_made)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                historyId,
                memoryId,
                oldQualityScore,
                scores.overall,
                'auto_enrichment',
                JSON.stringify({ scores })
            );
        }
    }

    /**
     * Score completeness (0-1)
     * Based on: content length, metadata presence, structured fields
     */
    private static scoreCompleteness(content: string, metadata?: any): number {
        let score = 0;

        // Content length (0-0.4)
        const words = content.split(/\s+/).length;
        if (words < 10) score += 0.1;
        else if (words < 30) score += 0.2;
        else if (words < 50) score += 0.3;
        else score += 0.4;

        // Has context (0-0.2)
        if (metadata?.context) score += 0.2;

        // Has outcomes (0-0.2)
        if (metadata?.outcomes) score += 0.2;

        // Has tags (0-0.1)
        if (metadata?.tags && metadata.tags.length > 0) score += 0.1;

        // Has emotions (0-0.1)
        if (metadata?.emotions) score += 0.1;

        return Math.min(score, 1.0);
    }

    /**
     * Score clarity (0-1)
     * Based on: readability, structure, grammar indicators
     */
    private static scoreClarity(content: string): number {
        let score = 0.5; // Start at neutral

        // Sentence structure
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 0) return 0.2;

        // Average sentence length (15-25 words is ideal)
        const avgSentenceLength = content.split(/\s+/).length / sentences.length;
        if (avgSentenceLength >= 10 && avgSentenceLength <= 30) {
            score += 0.2;
        } else if (avgSentenceLength < 5 || avgSentenceLength > 50) {
            score -= 0.1;
        }

        // Has punctuation (indicates structure)
        if (content.match(/[.!?]/g)) score += 0.1;
        if (content.match(/[,:;]/g)) score += 0.1;

        // Not all caps (indicates better writing)
        if (content !== content.toUpperCase()) score += 0.1;

        return Math.max(0, Math.min(score, 1.0));
    }

    /**
     * Score usefulness (0-1)
     * Based on: actionable content, specific details, practical value
     */
    private static scoreUsefulness(content: string, metadata?: any): number {
        let score = 0.3; // Base score

        // Contains action words (indicates actionable content)
        const actionWords = /\b(learn|do|try|use|apply|remember|note|important|key|critical)\b/gi;
        const actionMatches = content.match(actionWords);
        if (actionMatches && actionMatches.length > 0) {
            score += Math.min(actionMatches.length * 0.1, 0.3);
        }

        // Contains specific details (numbers, dates, names)
        const specifics = /\b\d+\b|\b\d{4}-\d{2}-\d{2}\b/g;
        if (content.match(specifics)) score += 0.15;

        // Has high importance score
        if (metadata?.importanceScore && metadata.importanceScore > 0.7) {
            score += 0.15;
        }

        // Has outcomes documented
        if (metadata?.outcomes) score += 0.1;

        return Math.min(score, 1.0);
    }

    /**
     * Score context richness (0-1)
     * Based on: metadata fields, tags, emotions, relationships
     */
    private static scoreContextRichness(metadata?: any): number {
        if (!metadata) return 0.2;

        let score = 0;

        // Has context field (0-0.3)
        if (metadata.context) {
            const contextLength = metadata.context.length;
            if (contextLength > 100) score += 0.3;
            else if (contextLength > 50) score += 0.2;
            else score += 0.1;
        }

        // Has emotions (0-0.2)
        if (metadata.emotions) {
            if (Array.isArray(metadata.emotions) && metadata.emotions.length > 0) {
                score += 0.2;
            } else if (typeof metadata.emotions === 'string' && metadata.emotions.length > 0) {
                score += 0.15;
            }
        }

        // Has tags (0-0.2)
        if (metadata.tags && Array.isArray(metadata.tags)) {
            if (metadata.tags.length >= 3) score += 0.2;
            else if (metadata.tags.length >= 1) score += 0.1;
        }

        // Has relationships (0-0.2)
        if (metadata.relatedMemories && metadata.relatedMemories.length > 0) {
            score += Math.min(metadata.relatedMemories.length * 0.05, 0.2);
        }

        // Has custom metadata (0-0.1)
        const customFields = Object.keys(metadata).filter(
            k => !['context', 'emotions', 'tags', 'relatedMemories', 'importanceScore'].includes(k)
        );
        if (customFields.length > 0) score += 0.1;

        return Math.min(score, 1.0);
    }

    /**
     * Get quality statistics for a user
     */
    static async getQualityStats(userId: string): Promise<{
        totalMemories: number;
        averageQuality: number;
        highQuality: number;
        mediumQuality: number;
        lowQuality: number;
        needsImprovement: number;
    }> {
        const db = getDatabase();

        const stats = db.prepare(`
            SELECT
                COUNT(*) as total,
                AVG(quality_score) as avg_quality,
                SUM(CASE WHEN quality_score >= 80 THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN quality_score >= 60 AND quality_score < 80 THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN quality_score < 60 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN needs_improvement = 1 THEN 1 ELSE 0 END) as needs_improvement
            FROM memories
            WHERE user_id = ? AND status = 'active'
        `).get(userId) as any;

        return {
            totalMemories: stats?.total || 0,
            averageQuality: Math.round((stats?.avg_quality || 50) * 10) / 10,
            highQuality: stats?.high || 0,
            mediumQuality: stats?.medium || 0,
            lowQuality: stats?.low || 0,
            needsImprovement: stats?.needs_improvement || 0
        };
    }

    /**
     * Get low quality memories that need improvement
     */
    static async getLowQualityMemories(userId: string, limit = 10): Promise<any[]> {
        const db = getDatabase();

        return db.prepare(`
            SELECT id, type, content, quality_score, completeness_score, clarity_score, usefulness_score, created_at
            FROM memories
            WHERE user_id = ? AND status = 'active' AND quality_score < 60
            ORDER BY quality_score ASC, created_at DESC
            LIMIT ?
        `).all(userId, limit) as any[];
    }
}
