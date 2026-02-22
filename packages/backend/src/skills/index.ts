/**
 * Skills System
 * Main entry point for skills system
 */

export * from './types.js';
export * from './parser.js';
export * from './registry.js';
export * from './executor.js';

// Re-export singletons
export { getSkillsParser } from './parser.js';
export { getSkillsRegistry } from './registry.js';
export { getSkillsExecutor } from './executor.js';
