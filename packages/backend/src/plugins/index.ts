/**
 * Plugin System
 * Main entry point for plugin system
 */

export * from './types.js';
export * from './registry.js';
export * from './loader.js';
export * from './manager.js';

// Re-export singletons
export { getPluginRegistry } from './registry.js';
export { getPluginLoader } from './loader.js';
export { getPluginManager } from './manager.js';
