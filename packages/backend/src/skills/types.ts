/**
 * Skills System Types
 * Compatible with SKILL.md format
 */

/**
 * Skill Source (Precedence: workspace > managed > bundled)
 */
export type SkillSource = 'bundled' | 'managed' | 'workspace';

/**
 * Setting Types
 */
export type SkillSettingType =
  | 'string'
  | 'secret'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email';

/**
 * Skill Setting Definition
 */
export interface SkillSettingDefinition {
  key: string;
  type: SkillSettingType;
  label: string;
  description?: string;
  helpUrl?: string;
  placeholder?: string;
  required: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

/**
 * Skill Install Option
 */
export interface SkillInstallOption {
  id: string;
  kind: 'brew' | 'apt' | 'winget' | 'npm' | 'pip' | 'manual';
  formula?: string;
  package?: string;
  bins?: string[];
  label: string;
  url?: string;
}

/**
 * Skill Metadata (from YAML frontmatter)
 */
export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;

  // Display
  emoji?: string;

  // Trigger words
  triggers?: string[];

  // Settings schema
  settings?: SkillSettingDefinition[];

  // Requirements
  requires?: {
    bins?: string[];
    env?: string[];
    apis?: string[];
    libs?: string[];
    llm?: boolean;
    storage?: boolean;
    packages?: {
      npm?: string[];
      pip?: string[];
    };
  };

  // Installation instructions
  install?: SkillInstallOption[];

  // Additional metadata
  tags?: string[];
  category?: string;
  homepage?: string;
  license?: string;
}

/**
 * Parsed Skill
 */
export interface Skill {
  // Metadata
  id: string;
  name: string;
  description: string;
  version: string;
  source: SkillSource;

  // Content
  metadata: SkillMetadata;
  instructions: string; // Markdown content

  // Settings
  settingsSchema: SkillSettingDefinition[];
  settings: Record<string, any>;

  // State
  enabled: boolean;

  // File info
  filePath: string;
  lastModified?: Date;
}

/**
 * Skill Execution Context
 */
export interface SkillExecutionContext {
  // User info
  userId?: string;
  sessionId?: string;
  channelId?: string;

  // Message
  message: string;

  // Settings
  settings: Record<string, any>;

  // Tools available
  tools?: any;
}

/**
 * Skill Execution Result
 */
export interface SkillExecutionResult {
  success: boolean;
  output?: string;
  data?: any;
  error?: string;
  usage?: {
    tokens?: number;
    cost?: number;
  };
}

/**
 * Skills Registry Interface
 */
export interface ISkillsRegistry {
  // Load skills
  load(directories: string[]): Promise<void>;

  // Query
  get(name: string): Skill | undefined;
  getAll(): Skill[];
  getEnabled(): Skill[];
  getBySource(source: SkillSource): Skill[];

  // Management
  add(skill: Skill): void;
  remove(name: string): void;
  enable(name: string): void;
  disable(name: string): void;

  // Hot reload
  reload(): Promise<void>;
  watch(): void;
}

/**
 * Skills Parser Interface
 */
export interface ISkillsParser {
  parse(filePath: string): Promise<Skill>;
  parseContent(content: string, filePath: string): Skill;
  validate(skill: Skill): boolean;
}

/**
 * Skills Executor Interface
 */
export interface ISkillsExecutor {
  execute(skillName: string, context: SkillExecutionContext): Promise<SkillExecutionResult>;
}
