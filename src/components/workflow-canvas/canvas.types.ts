import type { Node, Edge, XYPosition } from '@xyflow/react';

/**
 * Canvas Node Types
 */
export enum NodeType {
  Trigger = 'trigger',
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Delay = 'delay',
  Transform = 'transform',
  Note = 'note',
}

/**
 * Node Data Interface
 */
export interface NodeData {
  label: string;
  type: NodeType;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;

  // Node-specific data
  actionType?: string; // For action nodes
  condition?: string; // For condition nodes
  delay?: number; // For delay nodes
  loopCount?: number; // For loop nodes
  content?: string; // For note nodes
  color?: string; // For note nodes background color

  // Execution state
  isExecuting?: boolean;
  hasError?: boolean;
  errorMessage?: string;

  // Configuration
  parameters?: Record<string, any>;
}

/**
 * Canvas Node (extends React Flow Node)
 */
export type CanvasNode = Node<NodeData>;

/**
 * Canvas Edge (extends React Flow Edge)
 */
export interface CanvasEdge extends Edge {
  animated?: boolean;
  label?: string;
  data?: {
    condition?: 'true' | 'false'; // For conditional branches
  };
}

/**
 * Workflow Canvas Props
 */
export interface WorkflowCanvasProps {
  workflowId?: string;
  readOnly?: boolean;
  onSave?: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  onExecute?: () => void;
  workflowName?: string;
  onWorkflowNameChange?: (name: string) => void;
  onBack?: () => void;
  initialNodes?: CanvasNode[];
  initialEdges?: CanvasEdge[];
}

/**
 * Node Configuration Panel Props
 */
export interface NodeConfigPanelProps {
  node: CanvasNode | null;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onClose: () => void;
}

/**
 * Node Palette Item
 */
export interface NodePaletteItem {
  type: NodeType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

/**
 * Canvas Actions
 */
export enum CanvasAction {
  AddNode = 'add-node',
  DeleteNode = 'delete-node',
  UpdateNode = 'update-node',
  AddEdge = 'add-edge',
  DeleteEdge = 'delete-edge',
  AutoLayout = 'auto-layout',
  FitView = 'fit-view',
  ZoomIn = 'zoom-in',
  ZoomOut = 'zoom-out',
}

/**
 * Canvas Event
 */
export interface CanvasEvent {
  type: CanvasAction;
  payload?: any;
}
