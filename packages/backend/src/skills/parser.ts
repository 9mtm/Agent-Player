/**
 * SKILL.md Parser
 * Parses SKILL.md files (YAML frontmatter + Markdown)
 * Parses SKILL.md files with YAML frontmatter
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { Skill, SkillMetadata, SkillSource, ISkillsParser, SkillSettingDefinition } from './types.js';

export class SkillsParser implements ISkillsParser {
  /**
   * Parse SKILL.md file
   */
  async parse(filePath: string): Promise<Skill> {
    console.log(`[SkillsParser] 📄 Parsing: ${filePath}`);

    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content, filePath);
  }

  /**
   * Parse SKILL.md content
   */
  parseContent(content: string, filePath: string): Skill {
    // Extract YAML frontmatter and Markdown content
    const { metadata, instructions } = this.extractParts(content);

    // Determine source from file path
    const source = this.determineSource(filePath);

    // Build skill object
    const skill: Skill = {
      id: this.generateId(metadata.name, source),
      name: metadata.name,
      description: metadata.description,
      version: metadata.version || '1.0.0',
      source,
      metadata,
      instructions,
      settingsSchema: metadata.settings || [],
      settings: {},
      enabled: true,
      filePath,
    };

    // Validate
    if (!this.validate(skill)) {
      throw new Error(`Invalid skill: ${skill.name}`);
    }

    return skill;
  }

  /**
   * Extract YAML frontmatter and Markdown content
   */
  private extractParts(content: string): {
    metadata: SkillMetadata;
    instructions: string;
  } {
    // Match YAML frontmatter (between --- and ---)
    // Support both Unix (\n) and Windows (\r\n) line endings
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      throw new Error('Invalid SKILL.md format: missing YAML frontmatter');
    }

    const [, yamlContent, markdownContent] = match;

    // Parse YAML
    let rawMetadata: any;
    try {
      rawMetadata = yaml.load(yamlContent);
    } catch (error) {
      throw new Error(`Failed to parse YAML frontmatter: ${error}`);
    }

    // Validate required fields
    if (!rawMetadata.name || !rawMetadata.description) {
      throw new Error('SKILL.md must have name and description in frontmatter');
    }

    // Normalize metadata - support both formats:
    // 1. Flat format (legacy): { name, description, triggers, settings, ... }
    // 2. Nested format (new): { name, description, metadata: { agent-player: { ... } } }
    const metadata = this.normalizeMetadata(rawMetadata);

    return {
      metadata,
      instructions: markdownContent.trim(),
    };
  }

  /**
   * Normalize metadata from different formats
   */
  private normalizeMetadata(raw: any): SkillMetadata {
    // Check for nested format (metadata.agent-player)
    const nested = raw.metadata?.['agent-player'] || null;

    if (nested) {
      // New nested format
      return {
        name: raw.name,
        description: raw.description,
        version: nested.version || '1.0.0',
        author: nested.author,
        triggers: nested.triggers || [],
        settings: this.normalizeSettings(nested.settings || []),
        requires: this.normalizeRequires(nested.requires),
        tags: nested.tags || [],
        category: nested.category,
        // Additional agent-player specific fields
        emoji: nested.emoji,
        install: nested.install,
      } as SkillMetadata;
    }

    // Legacy flat format
    return {
      name: raw.name,
      description: raw.description,
      version: raw.version || '1.0.0',
      author: raw.author,
      triggers: raw.triggers || [],
      settings: this.normalizeSettings(raw.settings || []),
      requires: this.normalizeRequires(raw.requires),
      tags: raw.tags || [],
      category: raw.category,
    };
  }

  /**
   * Normalize settings array
   */
  private normalizeSettings(settings: any[]): SkillSettingDefinition[] {
    if (!Array.isArray(settings)) return [];

    return settings.map(s => ({
      key: s.key,
      type: s.type || 'string',
      label: s.label || s.key,
      description: s.description,
      required: s.required ?? false,
      default: s.default,
      options: s.options,
      validation: s.validation,
    }));
  }

  /**
   * Normalize requires object
   */
  private normalizeRequires(requires: any): SkillMetadata['requires'] {
    if (!requires) return undefined;

    return {
      bins: requires.bins || [],
      env: requires.env || [],
      packages: {
        npm: requires.libs || requires.packages?.npm || [],
        pip: requires.packages?.pip || [],
      },
    };
  }

  /**
   * Determine skill source from file path
   */
  private determineSource(filePath: string): SkillSource {
    const normalizedPath = path.normalize(filePath).toLowerCase();

    if (normalizedPath.includes('bundled') || normalizedPath.includes('skills/bundled')) {
      return 'bundled';
    } else if (normalizedPath.includes('managed') || normalizedPath.includes('skills/managed')) {
      return 'managed';
    } else if (normalizedPath.includes('workspace') || normalizedPath.includes('skills/workspace')) {
      return 'workspace';
    }

    // Default to workspace
    return 'workspace';
  }

  /**
   * Generate skill ID
   */
  private generateId(name: string, source: SkillSource): string {
    // Convert name to kebab-case
    const kebabName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `${source}-${kebabName}`;
  }

  /**
   * Validate skill
   */
  validate(skill: Skill): boolean {
    // Check required fields
    if (!skill.name || !skill.description || !skill.instructions) {
      console.error('[SkillsParser] ❌ Missing required fields');
      return false;
    }

    // Check name format
    if (!/^[a-zA-Z0-9\s-_]+$/.test(skill.name)) {
      console.error('[SkillsParser] ❌ Invalid skill name format');
      return false;
    }

    // Check version format (if provided)
    if (skill.version && !/^\d+\.\d+\.\d+/.test(skill.version)) {
      console.warn('[SkillsParser] ⚠️  Invalid version format (expected semver)');
      // Don't fail, just warn
    }

    // Validate settings schema
    if (skill.settingsSchema && skill.settingsSchema.length > 0) {
      for (const setting of skill.settingsSchema) {
        if (!setting.key || !setting.type || !setting.label) {
          console.error('[SkillsParser] ❌ Invalid setting schema');
          return false;
        }
      }
    }

    return true;
  }
}

// Singleton instance
let parserInstance: SkillsParser | null = null;

export function getSkillsParser(): SkillsParser {
  if (!parserInstance) {
    parserInstance = new SkillsParser();
  }
  return parserInstance;
}
