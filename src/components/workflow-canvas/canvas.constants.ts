/**
 * Canvas constants - Matching n8n exactly
 * Based on: packages/frontend/editor-ui/src/app/utils/nodeViewUtils.ts
 */

export const GRID_SIZE = 16;

export const DEFAULT_NODE_SIZE: [number, number] = [GRID_SIZE * 6, GRID_SIZE * 6]; // [96, 96]
export const CONFIGURATION_NODE_RADIUS = (GRID_SIZE * 5) / 2; // 40
export const CONFIGURATION_NODE_SIZE: [number, number] = [
  CONFIGURATION_NODE_RADIUS * 2,
  CONFIGURATION_NODE_RADIUS * 2,
]; // [80, 80] - circular node
export const CONFIGURABLE_NODE_SIZE: [number, number] = [GRID_SIZE * 16, GRID_SIZE * 6]; // [256, 96]
export const DEFAULT_START_POSITION_X = GRID_SIZE * 11;
export const DEFAULT_START_POSITION_Y = GRID_SIZE * 15;
export const PUSH_NODES_OFFSET = DEFAULT_NODE_SIZE[0] * 2 + GRID_SIZE;

// Node specific dimensions
export const NODE_WIDTH = DEFAULT_NODE_SIZE[0]; // 96px
export const NODE_HEIGHT = DEFAULT_NODE_SIZE[1]; // 96px

// Sticky note dimensions
export const STICKY_MIN_WIDTH = 150;
export const STICKY_MIN_HEIGHT = 80;
export const STICKY_DEFAULT_WIDTH = 240;
export const STICKY_DEFAULT_HEIGHT = 140;

// Handle (connection point) dimensions
export const HANDLE_SIZE = 8; // 8px diameter
export const HANDLE_BORDER_WIDTH = 2;

// Spacing
export const NODE_SPACING_X = GRID_SIZE * 12; // 192px
export const NODE_SPACING_Y = GRID_SIZE * 10; // 160px
