/**
 * Tools System - Main Export
 *
 * This module exports all available tools and utilities for creating
 * and managing the tools registry.
 */

export * from './types.js';
export * from './registry.js';

// Re-export organized tools
export * from './core/index.js';
export * from './browser/index.js';
export * from './memory/index.js';
export * from './desktop/index.js';
export * from './storage/index.js';
export * from './cli/index.js';
export * from './notifications/index.js';
export * from './credentials/index.js';

// Utility function to create a pre-configured registry
import { ToolsRegistry } from './registry.js';
import type { ToolExecutionContext } from './types.js';

// Import tools from organized directories
import {
  execTool,
  readTool,
  writeTool,
  webFetchTool,
  executeCodeTool,
} from './core/index.js';

import {
  browserNavigateTool,
  browserScreenshotTool,
  browserExtractTool,
  browserInteractTool,
} from './browser/index.js';

import {
  memorySaveTool,
  memorySearchTool,
  memoryReflectTool,
  memoryStatsTool,
} from './memory/index.js';

import {
  desktopControlTool,
} from './desktop/index.js';

import {
  storageSaveTool,
  storageSearchTool,
  storageDeleteTool,
} from './storage/index.js';

import {
  geminiCliTool,
  claudeCliTool,
} from './cli/index.js';

import {
  createReminderTool,
} from './notifications/index.js';

import {
  credentialsSaveTool,
} from './credentials/index.js';

// Global registry of extension-provided tools (registered at extension startup)
import type { Tool } from './types.js';

const extensionTools: Tool[] = [];

/**
 * Register an extension tool globally (used by Extension SDK)
 */
export function registerExtensionTool(tool: Tool): void {
  // Remove if already exists
  const existingIndex = extensionTools.findIndex((t) => t.name === tool.name);
  if (existingIndex !== -1) {
    extensionTools.splice(existingIndex, 1);
  }
  extensionTools.push(tool);
}

/**
 * Unregister an extension tool globally (used by Extension SDK)
 */
export function unregisterExtensionTool(name: string): void {
  const index = extensionTools.findIndex((t) => t.name === name);
  if (index !== -1) {
    extensionTools.splice(index, 1);
  }
}

/**
 * Get all extension tools (optionally filtered by extensionId)
 */
export function getExtensionTools(extensionId?: string): Tool[] {
  if (extensionId) {
    return extensionTools.filter((t) => t.extensionId === extensionId);
  }
  return [...extensionTools];
}

/**
 * Create a tools registry with all tools registered
 */
export function createToolsRegistry(context: ToolExecutionContext): ToolsRegistry {
  const registry = new ToolsRegistry(context);

  // Register core tools
  registry.register(execTool);
  registry.register(readTool);
  registry.register(writeTool);
  registry.register(webFetchTool);
  registry.register(executeCodeTool);

  // Register browser tools
  registry.register(browserNavigateTool);
  registry.register(browserScreenshotTool);
  registry.register(browserExtractTool);
  registry.register(browserInteractTool);

  // Register memory tools
  registry.register(memorySaveTool);
  registry.register(memorySearchTool);
  registry.register(memoryReflectTool);
  registry.register(memoryStatsTool);

  // Register desktop control tool
  registry.register(desktopControlTool);

  // Register storage tools (Cache + CDN)
  registry.register(storageSaveTool);
  registry.register(storageSearchTool);
  registry.register(storageDeleteTool);

  // Register CLI bridge tools (DISABLED - not needed when using API directly)
  // registry.register(geminiCliTool);
  // registry.register(claudeCliTool);

  // Register notification tools
  registry.register(createReminderTool);

  // Register credentials tools
  registry.register(credentialsSaveTool);

  // Register extension-provided tools
  for (const tool of extensionTools) {
    registry.register(tool);
  }

  const coreToolsCount = 19;  // Increased from 18 (added execute_code)
  const totalToolsCount = coreToolsCount + extensionTools.length;

  console.log(`[Tools] 🔧 Tools registry created with ${totalToolsCount} tools`);
  console.log('  ├── Core: 5 tools (exec, read, write, web_fetch, execute_code)');
  console.log('  ├── Browser: 4 tools (navigate, screenshot, extract, interact)');
  console.log('  ├── Memory: 4 tools (save, search, reflect, stats)');
  console.log('  ├── Desktop: 1 tool (desktop_control)');
  console.log('  ├── Storage: 3 tools (storage_save, storage_search, storage_delete)');
  console.log('  ├── Credentials: 1 tool (credentials_save)');
  console.log('  ├── Notifications: 1 tool (create_reminder)');
  if (extensionTools.length > 0) {
    console.log(`  └── Extensions: ${extensionTools.length} tools (${extensionTools.map(t => t.name).join(', ')})`);
  }

  return registry;
}
