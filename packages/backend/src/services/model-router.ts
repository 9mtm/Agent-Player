/**
 * Model Router - Smart Model Selection for Cost Optimization
 *
 * Analyzes task complexity and routes to appropriate model:
 * - Haiku (Fast & Cheap) → Simple tasks (90% cheaper)
 * - Sonnet (Balanced) → Medium tasks (balanced)
 * - Opus (Powerful) → Complex tasks only
 *
 * Based on 2026 research: Plan-and-Execute pattern reduces costs by 90%
 * Source: https://onereach.ai/blog/best-practices-for-ai-agent-implementations/
 */

export type ModelTier = 'haiku' | 'sonnet' | 'opus';
export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface ModelRouterConfig {
  // Override automatic routing (optional)
  forceModel?: ModelTier;
  // User preference for default model
  preferredModel?: ModelTier;
  // Enable/disable cost optimization
  costOptimizationEnabled?: boolean;
}

export interface TaskAnalysis {
  complexity: TaskComplexity;
  recommendedModel: ModelTier;
  reasoning: string;
  estimatedCostSavings?: number; // Percentage vs always using Opus
}

/**
 * Analyze task complexity based on multiple signals
 */
export class ModelRouter {
  private readonly SIMPLE_KEYWORDS = [
    'translate', 'summarize', 'list', 'show', 'get', 'what is',
    'define', 'explain briefly', 'quick', 'simple', 'short answer',
  ];

  private readonly COMPLEX_KEYWORDS = [
    'design', 'architecture', 'plan', 'strategy', 'analyze deeply',
    'compare', 'evaluate', 'decide', 'recommend', 'complex',
    'multi-step', 'comprehensive', 'detailed analysis',
  ];

  private readonly TOOL_COMPLEXITY_MAP: Record<string, TaskComplexity> = {
    // Simple tools (data retrieval)
    'read': 'simple',
    'web_fetch': 'simple',
    'storage_search': 'simple',
    'memory_search': 'simple',

    // Medium tools (data processing)
    'exec': 'medium',
    'write': 'medium',
    'memory_save': 'medium',
    'browser_navigate': 'medium',
    'browser_screenshot': 'medium',

    // Complex tools (advanced operations)
    'execute_code': 'complex',
    'browser_interact': 'complex',
    'browser_extract': 'complex',
    'desktop_control': 'complex',
    'memory_reflect': 'complex',
  };

  constructor(private config: ModelRouterConfig = {}) {}

  /**
   * Main routing function - determines which model to use
   */
  analyzeAndRoute(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    requestedTools?: string[]
  ): TaskAnalysis {
    // If cost optimization is disabled, use preferred or default model
    if (this.config.costOptimizationEnabled === false) {
      return {
        complexity: 'medium',
        recommendedModel: this.config.preferredModel || 'sonnet',
        reasoning: 'Cost optimization disabled - using default model',
      };
    }

    // If user forces a specific model, use it
    if (this.config.forceModel) {
      return {
        complexity: 'medium',
        recommendedModel: this.config.forceModel,
        reasoning: `User requested specific model: ${this.config.forceModel}`,
      };
    }

    // Analyze task complexity
    const complexity = this.analyzeComplexity(
      userMessage,
      conversationHistory,
      requestedTools
    );

    // Map complexity to model
    const recommendedModel = this.mapComplexityToModel(complexity);

    // Calculate estimated savings
    const estimatedCostSavings = this.calculateSavings(recommendedModel);

    return {
      complexity,
      recommendedModel,
      reasoning: this.getReasoningForComplexity(complexity, requestedTools),
      estimatedCostSavings,
    };
  }

  /**
   * Analyze task complexity using multiple signals
   */
  private analyzeComplexity(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    requestedTools?: string[]
  ): TaskComplexity {
    const messageLower = userMessage.toLowerCase();
    let complexityScore = 0;

    // Signal 1: Keyword analysis
    const hasSimpleKeywords = this.SIMPLE_KEYWORDS.some((kw) =>
      messageLower.includes(kw)
    );
    const hasComplexKeywords = this.COMPLEX_KEYWORDS.some((kw) =>
      messageLower.includes(kw)
    );

    if (hasSimpleKeywords) complexityScore -= 2;
    if (hasComplexKeywords) complexityScore += 2;

    // Signal 2: Message length (longer = more complex)
    if (userMessage.length > 500) complexityScore += 1;
    if (userMessage.length < 100) complexityScore -= 1;

    // Signal 3: Tool usage patterns
    if (requestedTools && requestedTools.length > 0) {
      const toolComplexities = requestedTools.map(
        (tool) => this.TOOL_COMPLEXITY_MAP[tool] || 'medium'
      );

      if (toolComplexities.includes('complex')) complexityScore += 2;
      if (toolComplexities.every((c) => c === 'simple')) complexityScore -= 1;
      if (requestedTools.length > 3) complexityScore += 1; // Multi-tool = complex
    }

    // Signal 4: Conversation context (follow-up questions are usually simpler)
    if (conversationHistory.length > 2) {
      const lastUserMessage = conversationHistory
        .slice()
        .reverse()
        .find((m) => m.role === 'user')?.content || '';

      if (lastUserMessage.toLowerCase().includes('?')) {
        complexityScore -= 1; // Follow-up questions are usually simpler
      }
    }

    // Signal 5: Code generation requests (medium complexity)
    if (
      messageLower.includes('code') ||
      messageLower.includes('function') ||
      messageLower.includes('implement')
    ) {
      complexityScore += 1;
    }

    // Signal 6: Question vs statement
    if (userMessage.includes('?') && userMessage.length < 200) {
      complexityScore -= 1; // Simple questions
    }

    // Map score to complexity
    if (complexityScore <= -2) return 'simple';
    if (complexityScore >= 2) return 'complex';
    return 'medium';
  }

  /**
   * Map complexity level to appropriate model
   */
  private mapComplexityToModel(complexity: TaskComplexity): ModelTier {
    switch (complexity) {
      case 'simple':
        return 'haiku'; // Fast & cheap
      case 'medium':
        return 'sonnet'; // Balanced (current default)
      case 'complex':
        return 'opus'; // Powerful
    }
  }

  /**
   * Calculate estimated cost savings vs always using Opus
   */
  private calculateSavings(model: ModelTier): number {
    // Based on Anthropic pricing (approximate ratios)
    // Opus: 1x (baseline)
    // Sonnet: ~0.1x (90% cheaper)
    // Haiku: ~0.01x (99% cheaper)

    switch (model) {
      case 'haiku':
        return 99; // 99% savings
      case 'sonnet':
        return 90; // 90% savings
      case 'opus':
        return 0; // No savings (baseline)
    }
  }

  /**
   * Generate human-readable reasoning
   */
  private getReasoningForComplexity(
    complexity: TaskComplexity,
    tools?: string[]
  ): string {
    switch (complexity) {
      case 'simple':
        return `Simple task detected (${tools?.length || 0} tools). Using Haiku for 99% cost savings.`;
      case 'medium':
        return `Medium complexity task (${tools?.length || 0} tools). Using Sonnet for balanced performance and cost.`;
      case 'complex':
        return `Complex task requiring deep reasoning (${tools?.length || 0} tools). Using Opus for maximum capability.`;
    }
  }

  /**
   * Get model name for Anthropic API
   */
  static getModelName(tier: ModelTier): string {
    switch (tier) {
      case 'haiku':
        return 'claude-haiku-4-5-20251001';
      case 'sonnet':
        return 'claude-sonnet-4-5-20250929';
      case 'opus':
        return 'claude-opus-4-6';
    }
  }
}

/**
 * Helper: Create router with default config
 */
export function createModelRouter(
  config?: ModelRouterConfig
): ModelRouter {
  return new ModelRouter({
    costOptimizationEnabled: true,
    ...config,
  });
}
