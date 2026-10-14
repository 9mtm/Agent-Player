/**
 * Reasoning Coherence Analyzer
 *
 * Analyzes agent response quality across 5 dimensions:
 * - Coherence: Overall logical consistency
 * - Logical Flow: Step-by-step reasoning quality
 * - Context Awareness: Understands conversation context
 * - Completeness: Addresses all user requirements
 * - Clarity: Clear, understandable explanations
 */

import { tsParam } from '../db/pg/dialect.js';
import { q } from '../repositories/sql-steps.js';
import { v4 as uuidv4 } from 'uuid';

interface ReasoningAnalysis {
    coherenceScore: number;
    logicalFlowScore: number;
    contextAwarenessScore: number;
    completenessScore: number;
    clarityScore: number;
    analysis: string;
    sampleText: string;
}

/**
 * Analyze reasoning quality for an agent over a time period
 * Returns average coherence score (0-100)
 */
export async function analyzeReasoning(
    sessionId: string,
    agentId: string,
    startDate: Date,
    endDate: Date
): Promise<number> {
    // created_at is CURRENT_TIMESTAMP text on SQLite, timestamptz on PostgreSQL:
    // tsParam compares the ISO bounds correctly on both.
    const ts = tsParam(q.dialect);

    // Get assistant messages from the period
    // Note: chat_messages doesn't have agent_id, so we analyze all assistant messages
    const messages = await q.all(`
        SELECT m.id, m.content, m.created_at, s.title as session_name
        FROM chat_messages m
        LEFT JOIN chat_sessions s ON m.session_id = s.id
        WHERE m.role = 'assistant'
        AND m.created_at >= ${ts}
        AND m.created_at <= ${ts}
        AND LENGTH(m.content) > 100
        ORDER BY m.created_at DESC
        LIMIT 50`,
        startDate.toISOString(), endDate.toISOString());

    if (messages.length === 0) {
        // No data to analyze
        return 0;
    }

    const scores: number[] = [];

    // Analyze each message
    for (const message of messages) {
        const analysis = analyzeMessageReasoning(message.content);

        // Save reasoning score to DB
        await q.run(`
            INSERT INTO reasoning_scores (
                id, session_id, agent_id, message_id,
                coherence_score, logical_flow_score, context_awareness_score,
                completeness_score, clarity_score, analysis, sample_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            uuidv4(),
            sessionId,
            agentId,
            message.id,
            analysis.coherenceScore,
            analysis.logicalFlowScore,
            analysis.contextAwarenessScore,
            analysis.completenessScore,
            analysis.clarityScore,
            analysis.analysis,
            analysis.sampleText.substring(0, 500)
        );

        scores.push(analysis.coherenceScore);
    }

    // Return average coherence score
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avgScore);
}

/**
 * Analyze reasoning quality of a single message
 */
function analyzeMessageReasoning(content: string): ReasoningAnalysis {
    let coherenceScore = 100;
    let logicalFlowScore = 100;
    let contextAwarenessScore = 100;
    let completenessScore = 100;
    let clarityScore = 100;
    const issues: string[] = [];

    // 1. Coherence checks
    if (content.includes('However') && content.includes('Therefore') && content.split('However').length > 3) {
        // Too many contradictions
        coherenceScore -= 15;
        issues.push('Multiple contradictions detected');
    }

    if (content.toLowerCase().includes('i\'m not sure') || content.toLowerCase().includes('i don\'t know')) {
        coherenceScore -= 10;
        issues.push('Uncertainty expressed');
    }

    // 2. Logical Flow checks
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 3) {
        logicalFlowScore -= 20;
        issues.push('Response too brief');
    }

    // Check for logical connectors
    const connectors = ['therefore', 'because', 'thus', 'hence', 'so', 'as a result', 'consequently'];
    const hasConnectors = connectors.some(c => content.toLowerCase().includes(c));
    if (sentences.length > 5 && !hasConnectors) {
        logicalFlowScore -= 15;
        issues.push('Lacks logical connectors');
    }

    // 3. Context Awareness checks
    if (content.toLowerCase().includes('as you mentioned') ||
        content.toLowerCase().includes('based on your') ||
        content.toLowerCase().includes('referring to')) {
        contextAwarenessScore += 0; // Bonus already at 100
    } else if (sentences.length > 5) {
        contextAwarenessScore -= 10;
        issues.push('Limited context reference');
    }

    // 4. Completeness checks
    if (content.length < 100) {
        completenessScore -= 30;
        issues.push('Response too short');
    }

    if (content.includes('...') && !content.includes('example') && !content.includes('etc')) {
        completenessScore -= 10;
        issues.push('Incomplete thoughts');
    }

    // 5. Clarity checks
    const avgWordLength = content.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / content.split(/\s+/).length;
    if (avgWordLength > 7) {
        clarityScore -= 10;
        issues.push('Complex vocabulary');
    }

    const avgSentenceLength = content.length / sentences.length;
    if (avgSentenceLength > 150) {
        clarityScore -= 15;
        issues.push('Long, complex sentences');
    }

    // Check for code blocks or structured output (good for clarity)
    if (content.includes('```') || content.includes('- ')) {
        clarityScore = Math.min(100, clarityScore + 5);
    }

    // Ensure scores stay in 0-100 range
    coherenceScore = Math.max(0, Math.min(100, coherenceScore));
    logicalFlowScore = Math.max(0, Math.min(100, logicalFlowScore));
    contextAwarenessScore = Math.max(0, Math.min(100, contextAwarenessScore));
    completenessScore = Math.max(0, Math.min(100, completenessScore));
    clarityScore = Math.max(0, Math.min(100, clarityScore));

    const analysis = issues.length > 0
        ? `Issues detected: ${issues.join('; ')}`
        : 'High-quality reasoning with good coherence and clarity';

    return {
        coherenceScore,
        logicalFlowScore,
        contextAwarenessScore,
        completenessScore,
        clarityScore,
        analysis,
        sampleText: content.substring(0, 500),
    };
}
