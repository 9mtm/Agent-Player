/**
 * Tools System - Type Definitions
 *
 * Tools are executable functions that the LLM can call.
 * Unlike Skills (which are instructions), Tools actually DO things.
 */

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  required?: boolean;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
  details?: Record<string, any>;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: ToolParameters;
  execute: (params: Record<string, any>) => Promise<ToolResult>;
  extensionId?: string; // Optional: tracks which extension registered this tool
}

export interface ToolExecutionContext {
  workspaceDir: string;
  timeout?: number;
  userId?: string;
  sessionId?: string;
}
