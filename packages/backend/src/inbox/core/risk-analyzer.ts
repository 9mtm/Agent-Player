/**
 * Risk Analyzer - Smart risk assessment for incoming messages
 *
 * Analyzes messages to determine risk level (low/medium/high)
 * based on keywords, actions, volume, and source
 */

import type {
  InboxMessage,
  RiskAssessment,
  RiskSignal,
  RiskSignalType,
  RiskLevel
} from '../types.js';

export class RiskAnalyzer {
  // Keywords that indicate dangerous actions
  private readonly dangerousKeywords = [
    // Deletion keywords
    'delete', 'remove', 'drop', 'destroy', 'purge', 'erase', 'wipe',
    'rm -rf', 'format', 'truncate',

    // Financial keywords
    'payment', 'transfer', 'send money', 'pay', 'withdraw',
    'transaction', 'bank', 'credit card',

    // System keywords
    'sudo', 'admin', 'root', 'execute', 'shell', 'command',
    'terminal', 'script', 'run', 'exec',

    // Modification keywords (when combined with 'all')
    'update all', 'modify all', 'change all', 'replace all'
  ];

  // Keywords that indicate bulk operations
  private readonly bulkIndicators = [
    'all', 'every', 'bulk', 'mass', 'entire', 'whole'
  ];

  // Keywords for system access
  private readonly systemAccessKeywords = [
    'exec', 'shell', 'command', 'terminal', 'bash', 'powershell',
    'cmd', 'console', 'process', 'spawn', 'fork'
  ];

  /**
   * Assess risk level of incoming message
   */
  async assess(message: Partial<InboxMessage>): Promise<RiskAssessment> {
    const signals: RiskSignal[] = [];

    const messageLower = message.message?.toLowerCase() || '';
    const metadata = message.metadata || {};

    // 1. Keyword-based detection
    this.detectDangerousKeywords(messageLower, signals);

    // 2. Bulk action detection
    this.detectBulkActions(messageLower, metadata, signals);

    // 3. External/untrusted source
    this.detectExternalSource(message, signals);

    // 4. System access detection
    this.detectSystemAccess(messageLower, signals);

    // 5. Destructive action patterns
    this.detectDestructivePatterns(messageLower, signals);

    // 6. Financial operations
    this.detectFinancialOperations(messageLower, metadata, signals);

    // Calculate total risk score
    const totalScore = signals.reduce((sum, s) => sum + s.weight, 0);

    // Determine risk level
    const level: RiskLevel = this.calculateRiskLevel(totalScore);

    return {
      level,
      signals,
      score: totalScore,
      recommendation: this.getRecommendation(level, signals)
    };
  }

  // ===================
  // Private detectors
  // ===================

  private detectDangerousKeywords(text: string, signals: RiskSignal[]): void {
    for (const keyword of this.dangerousKeywords) {
      if (text.includes(keyword)) {
        signals.push({
          type: 'dangerous_keyword',
          weight: 5,
          keyword: keyword,
          description: `Dangerous keyword detected: "${keyword}"`
        });
      }
    }
  }

  private detectBulkActions(text: string, metadata: any, signals: RiskSignal[]): void {
    // Check for bulk indicators in text
    const hasBulkIndicator = this.bulkIndicators.some(ind => text.includes(ind));

    // Extract numbers from text
    const numbers = text.match(/\d+/g);
    const maxNumber = numbers ? Math.max(...numbers.map(n => parseInt(n))) : 0;

    // Check metadata count
    const metadataCount = metadata?.count || 0;

    const count = Math.max(maxNumber, metadataCount);

    if (hasBulkIndicator || count > 10) {
      signals.push({
        type: 'bulk_action',
        weight: count > 100 ? 6 : count > 50 ? 5 : count > 10 ? 3 : 2,
        count: count,
        description: `Bulk operation detected: ${count} items`
      });
    }
  }

  private detectExternalSource(message: Partial<InboxMessage>, signals: RiskSignal[]): void {
    // External webhooks are less trusted
    if (message.sourceType === 'webhook' && !message.metadata?.trusted) {
      signals.push({
        type: 'external_source',
        weight: 2,
        source: message.sourceType,
        description: 'Message from external/untrusted webhook'
      });
    }

    // First-time source (not in allowlist)
    if (message.metadata?.firstTime) {
      signals.push({
        type: 'external_source',
        weight: 1,
        description: 'First time receiving message from this source'
      });
    }
  }

  private detectSystemAccess(text: string, signals: RiskSignal[]): void {
    for (const keyword of this.systemAccessKeywords) {
      if (text.includes(keyword)) {
        signals.push({
          type: 'system_access',
          weight: 4,
          keyword: keyword,
          description: `System access keyword detected: "${keyword}"`
        });
      }
    }
  }

  private detectDestructivePatterns(text: string, signals: RiskSignal[]): void {
    // Patterns like "delete all X" or "remove every Y"
    const destructivePatterns = [
      /delete\s+(all|every|entire)/i,
      /remove\s+(all|every|entire)/i,
      /drop\s+(all|every|entire)/i,
      /wipe\s+(all|every|entire)/i,
      /clear\s+(all|every|entire)/i
    ];

    for (const pattern of destructivePatterns) {
      if (pattern.test(text)) {
        signals.push({
          type: 'destructive_action',
          weight: 7,
          description: 'Destructive action pattern detected'
        });
        break; // Only add once
      }
    }
  }

  private detectFinancialOperations(text: string, metadata: any, signals: RiskSignal[]): void {
    const financialKeywords = [
      'payment', 'pay', 'transfer', 'send money', 'withdraw',
      'deposit', 'transaction', 'invoice', 'bill'
    ];

    const hasFinancialKeyword = financialKeywords.some(kw => text.includes(kw));

    // Check for amount/currency in metadata
    const hasAmount = metadata?.amount !== undefined;
    const hasCurrency = metadata?.currency !== undefined;

    if (hasFinancialKeyword || hasAmount || hasCurrency) {
      signals.push({
        type: 'financial_action',
        weight: 8,
        description: 'Financial operation detected'
      });
    }
  }

  // ===================
  // Risk calculation
  // ===================

  private calculateRiskLevel(score: number): RiskLevel {
    if (score === 0) {
      return 'low';
    } else if (score < 5) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private getRecommendation(level: RiskLevel, signals: RiskSignal[]): string {
    if (level === 'low') {
      return 'Safe to auto-execute without approval';
    }

    if (level === 'medium') {
      const reasons = this.summarizeSignals(signals);
      return `Medium risk detected (${reasons}). Check approval rules or request approval.`;
    }

    // High risk
    const reasons = this.summarizeSignals(signals);
    return `High risk detected (${reasons}). Always request human approval.`;
  }

  private summarizeSignals(signals: RiskSignal[]): string {
    const types = new Set(signals.map(s => s.type));
    const typesArray = Array.from(types);

    const labels: Record<RiskSignalType, string> = {
      dangerous_keyword: 'dangerous action',
      bulk_action: 'bulk operation',
      external_source: 'external source',
      system_access: 'system access',
      destructive_action: 'destructive action',
      financial_action: 'financial operation'
    };

    return typesArray.map(t => labels[t]).join(', ');
  }

  // ===================
  // Public utility methods
  // ===================

  /**
   * Check if specific action is safe (low risk)
   */
  isSafeAction(message: string): boolean {
    const safePatterns = [
      /^(what|how|when|where|why|who|which)\s/i,  // Questions
      /^(get|show|list|find|search)\s/i,          // Read operations
      /^(weather|forecast|temperature)/i,         // Weather queries
      /^(status|check|verify)/i                   // Status checks
    ];

    return safePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get detailed risk explanation for UI
   */
  explainRisk(assessment: RiskAssessment): string {
    if (assessment.level === 'low') {
      return 'This action is safe and can be executed automatically.';
    }

    const parts: string[] = [];

    for (const signal of assessment.signals) {
      if (signal.description) {
        parts.push(`• ${signal.description}`);
      }
    }

    return parts.join('\n');
  }
}
