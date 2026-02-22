/**
 * Skills Executor
 * Executes skills with context and returns results
 */

import type {
  Skill,
  SkillExecutionContext,
  SkillExecutionResult,
  ISkillsExecutor,
} from './types.js';
import { getSkillsRegistry } from './registry.js';

export class SkillsExecutor implements ISkillsExecutor {
  private registry = getSkillsRegistry();

  /**
   * Execute a skill
   */
  async execute(
    skillName: string,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    console.log(`[SkillsExecutor] 🔧 Executing skill: ${skillName}`);

    const skill = this.registry.get(skillName);

    if (!skill) {
      return {
        success: false,
        error: `Skill "${skillName}" not found`,
      };
    }

    if (!skill.enabled) {
      return {
        success: false,
        error: `Skill "${skillName}" is disabled`,
      };
    }

    try {
      // Build execution prompt
      const prompt = this.buildExecutionPrompt(skill, context);

      // Execute skill (delegated to agent runtime)
      const result = await this.executeSkill(skill, prompt, context);

      console.log(`[SkillsExecutor] ✅ Skill executed successfully`);

      return {
        success: true,
        output: result.output,
        data: result.data,
        usage: result.usage,
      };
    } catch (error: any) {
      console.error(`[SkillsExecutor] ❌ Execution failed:`, error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build execution prompt from skill instructions and context
   */
  private buildExecutionPrompt(skill: Skill, context: SkillExecutionContext): string {
    let prompt = '';

    // Add skill instructions
    prompt += `# ${skill.name}\n\n`;
    prompt += skill.instructions;
    prompt += '\n\n';

    // Add user message
    prompt += `## User Request\n\n`;
    prompt += context.message;
    prompt += '\n\n';

    // Add settings (replace {{settings.key}} placeholders)
    prompt = this.interpolateSettings(prompt, context.settings);

    return prompt;
  }

  /**
   * Interpolate settings placeholders in prompt
   * Replaces {{settings.key}} with actual values
   */
  private interpolateSettings(prompt: string, settings: Record<string, any>): string {
    let result = prompt;

    // Find all {{settings.key}} patterns
    const regex = /\{\{settings\.(\w+)\}\}/g;

    result = result.replace(regex, (match, key) => {
      const value = settings[key];
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  /**
   * Execute skill (placeholder - will be integrated with agent runtime)
   */
  private async executeSkill(
    skill: Skill,
    prompt: string,
    context: SkillExecutionContext
  ): Promise<{ output: string; data?: any; usage?: any }> {
    // TODO: Integrate with agent runtime
    // For now, return the prompt as output
    return {
      output: `Skill ${skill.name} would execute with:\n\n${prompt}`,
      data: {},
      usage: {},
    };
  }

  /**
   * Check if skill can handle message
   */
  canHandle(skillName: string, message: string): boolean {
    const skill = this.registry.get(skillName);
    if (!skill || !skill.enabled) {
      return false;
    }

    // Check triggers
    if (!skill.metadata.triggers || skill.metadata.triggers.length === 0) {
      return false;
    }

    const messageLower = message.toLowerCase();

    for (const trigger of skill.metadata.triggers) {
      if (messageLower.includes(trigger.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find matching skills for a message
   */
  findMatchingSkills(message: string): Skill[] {
    const enabledSkills = this.registry.getEnabled();
    const matching: Skill[] = [];

    for (const skill of enabledSkills) {
      if (this.canHandle(skill.name, message)) {
        matching.push(skill);
      }
    }

    return matching;
  }
}

// Singleton instance
let executorInstance: SkillsExecutor | null = null;

export function getSkillsExecutor(): SkillsExecutor {
  if (!executorInstance) {
    executorInstance = new SkillsExecutor();
  }
  return executorInstance;
}
