'use client';

import { NoteNode } from './NoteNode';
import { TriggerNode } from './TriggerNode';
import { ConditionNode } from './ConditionNode';
import { ActionNode } from './ActionNode';
import { LoopNode } from './LoopNode';
import { DelayNode } from './DelayNode';
import { TransformNode } from './TransformNode';

/**
 * Node Types Map for React Flow
 *
 * Each node type has its own specialized component with unique shape and styling:
 * - trigger: Circular green node (80px) - starting point
 * - condition: Diamond yellow node - conditional branching
 * - action: Rectangular blue node (96×96px) - performs actions
 * - loop: Purple node with infinity badge - iterations
 * - delay: Orange node with duration badge - wait/pause
 * - transform: Indigo node with function badge - data transformation
 * - note: Sticky note for annotations
 */
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  delay: DelayNode,
  transform: TransformNode,
  note: NoteNode,
};
