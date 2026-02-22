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
// Utility function to create a pre-configured registry
import { ToolsRegistry } from './registry.js';
// Import tools from organized directories
import { execTool, readTool, writeTool, webFetchTool, } from './core/index.js';
import { browserNavigateTool, browserScreenshotTool, browserExtractTool, browserInteractTool, } from './browser/index.js';
import { memorySaveTool, memorySearchTool, memoryReflectTool, memoryStatsTool, } from './memory/index.js';
import { desktopControlTool, } from './desktop/index.js';
import { storageSaveTool, storageSearchTool, storageDeleteTool, } from './storage/index.js';
import { geminiCliTool, claudeCliTool, } from './cli/index.js';
const extensionTools = [];
/**
 * Register an extension tool globally (used by Extension SDK)
 */
export function registerExtensionTool(tool) {
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
export function unregisterExtensionTool(name) {
    const index = extensionTools.findIndex((t) => t.name === name);
    if (index !== -1) {
        extensionTools.splice(index, 1);
    }
}
/**
 * Create a tools registry with all tools registered
 */
export function createToolsRegistry(context) {
    const registry = new ToolsRegistry(context);
    // Register core tools
    registry.register(execTool);
    registry.register(readTool);
    registry.register(writeTool);
    registry.register(webFetchTool);
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
    // Register CLI bridge tools
    registry.register(geminiCliTool);
    registry.register(claudeCliTool);
    // Register extension-provided tools
    for (const tool of extensionTools) {
        registry.register(tool);
    }
    const coreToolsCount = 18;
    const totalToolsCount = coreToolsCount + extensionTools.length;
    console.log(`[Tools] 🔧 Tools registry created with ${totalToolsCount} tools`);
    console.log('  ├── Core: 4 tools (exec, read, write, web_fetch)');
    console.log('  ├── Browser: 4 tools (navigate, screenshot, extract, interact)');
    console.log('  ├── Memory: 4 tools (save, search, reflect, stats)');
    console.log('  ├── Desktop: 1 tool (desktop_control)');
    console.log('  ├── Storage: 3 tools (storage_save, storage_search, storage_delete)');
    console.log('  ├── CLI Bridge: 2 tools (gemini_cli, claude_cli)');
    if (extensionTools.length > 0) {
        console.log(`  └── Extensions: ${extensionTools.length} tools (${extensionTools.map(t => t.name).join(', ')})`);
    }
    return registry;
}
