/**
 * Extensions Manager
 * Handles loading, enabling, and disabling extensions
 */

import fs from 'fs';
import path from 'path';

export interface ExtensionConfig {
  [key: string]: {
    type: string;
    label?: string;
    description?: string;
    required?: boolean;
    default?: unknown;
    placeholder?: string;
  };
}

export interface SetupStep {
  title: string;
  description: string;
  link?: { url: string; label: string };
  image?: string;
}

export interface SetupGuide {
  title?: string;
  description?: string;
  videoUrl?: string;
  steps: SetupStep[];
  tips?: string[];
  warnings?: string[];
}

export interface ExtensionManifest {
  id: string;
  name: string;
  description: string;
  type: 'channel' | 'app' | 'theme';
  version: string;
  author?: string;
  main?: string;
  requires?: {
    env?: string[];
    os?: string[];
  };
  config?: ExtensionConfig;
  setupGuide?: SetupGuide;
}

export interface Extension extends ExtensionManifest {
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  error?: string;
  path: string;
}

export interface ExtensionState {
  enabled: boolean;
  config?: Record<string, unknown>;
  error?: string;
}

// Path to store extension states
const EXTENSIONS_DIR = path.join(process.cwd(), 'extensions');
const STATE_FILE = path.join(process.cwd(), 'data', 'extensions-state.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load extension states from file
function loadStates(): Record<string, ExtensionState> {
  ensureDataDir();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[Extensions] Error loading states:', error);
  }
  return {};
}

// Save extension states to file
function saveStates(states: Record<string, ExtensionState>) {
  ensureDataDir();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2));
  } catch (error) {
    console.error('[Extensions] Error saving states:', error);
  }
}

// Load a single extension from its directory
function loadExtension(extDir: string, type: string): Extension | null {
  const manifestPath = path.join(extDir, 'extension.json');

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest: ExtensionManifest = JSON.parse(content);

    const states = loadStates();
    const state = states[manifest.id];

    let status: Extension['status'] = 'disabled';
    let error: string | undefined;

    if (state?.enabled) {
      // Check if extension can actually run
      if (manifest.requires?.env) {
        const missingEnv = manifest.requires.env.filter(e => !process.env[e]);
        if (missingEnv.length > 0) {
          status = 'error';
          error = `Missing environment variable: ${missingEnv.join(', ')}`;
        } else {
          status = 'enabled';
        }
      } else {
        status = 'enabled';
      }

      // Check for state error
      if (state.error) {
        status = 'error';
        error = state.error;
      }
    }

    return {
      ...manifest,
      type: type as Extension['type'],
      status,
      error,
      path: extDir,
    };
  } catch (error) {
    console.error(`[Extensions] Error loading ${extDir}:`, error);
    return null;
  }
}

// List all extensions
export function listExtensions(): Extension[] {
  const extensions: Extension[] = [];
  const types = ['channels', 'apps', 'themes'];

  for (const type of types) {
    const typeDir = path.join(EXTENSIONS_DIR, type);
    const singularType = type.slice(0, -1); // channels -> channel

    if (!fs.existsSync(typeDir)) {
      continue;
    }

    const dirs = fs.readdirSync(typeDir);

    for (const dir of dirs) {
      const extDir = path.join(typeDir, dir);
      const stat = fs.statSync(extDir);

      if (stat.isDirectory()) {
        const ext = loadExtension(extDir, singularType);
        if (ext) {
          extensions.push(ext);
        }
      }
    }
  }

  return extensions;
}

// Get a single extension by ID
export function getExtension(id: string): Extension | null {
  const extensions = listExtensions();
  return extensions.find(e => e.id === id) || null;
}

// Enable an extension
export function enableExtension(id: string, config?: Record<string, unknown>): { success: boolean; message: string; error?: string } {
  const ext = getExtension(id);

  if (!ext) {
    return { success: false, message: 'Extension not found' };
  }

  const states = loadStates();

  // Check requirements
  if (ext.requires?.env) {
    const missingEnv = ext.requires.env.filter(e => !process.env[e]);
    if (missingEnv.length > 0) {
      states[id] = {
        enabled: true,
        config,
        error: `Missing environment variable: ${missingEnv.join(', ')}`
      };
      saveStates(states);
      return {
        success: false,
        message: `Extension enabled but has errors`,
        error: `Missing environment variable: ${missingEnv.join(', ')}`
      };
    }
  }

  // Enable the extension
  states[id] = { enabled: true, config };
  saveStates(states);

  return { success: true, message: `${ext.name} enabled successfully` };
}

// Disable an extension
export function disableExtension(id: string): { success: boolean; message: string } {
  const ext = getExtension(id);

  if (!ext) {
    return { success: false, message: 'Extension not found' };
  }

  const states = loadStates();
  states[id] = { enabled: false };
  saveStates(states);

  return { success: true, message: `${ext.name} disabled successfully` };
}

// Get extension config
export function getExtensionConfig(id: string): Record<string, unknown> | null {
  const states = loadStates();
  return states[id]?.config || null;
}
