'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NodeType } from './canvas.types';
import { Target, Zap, GitBranch, Clock, Repeat, Wrench, FileText } from 'lucide-react';

interface WorkflowSidebarProps {
  nodeCount: number;
  edgeCount: number;
  onAddNode: (type: NodeType) => void;
}

const NODE_TYPES: Array<{ type: NodeType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
  { type: 'trigger', label: 'Trigger', icon: Target, color: 'hover:bg-green-50' },
  { type: 'action', label: 'Action', icon: Zap, color: 'hover:bg-blue-50' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'hover:bg-yellow-50' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'hover:bg-orange-50' },
  { type: 'loop', label: 'Loop', icon: Repeat, color: 'hover:bg-purple-50' },
];

export function WorkflowSidebar({ nodeCount, edgeCount, onAddNode }: WorkflowSidebarProps) {
  return (
    <div className="w-[250px] border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Add Nodes</h2>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType.type}
              onClick={() => onAddNode(nodeType.type)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded text-sm',
                'transition-colors text-left',
                'border border-transparent hover:border-gray-200',
                nodeType.color
              )}
            >
              <nodeType.icon className="w-4 h-4 flex-shrink-0 text-gray-600" />
              <span className="text-gray-700">{nodeType.label}</span>
              <span className="ml-auto text-gray-400">+</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Info */}
      <div className="border-t border-gray-200 px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Workflow Info</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>Nodes:</span>
            <span className="font-medium">{nodeCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Connections:</span>
            <span className="font-medium">{edgeCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-600 font-medium">Enabled</span>
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Instructions</h3>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Click to add nodes</li>
          <li>• Drag to connect</li>
          <li>• Delete key to remove</li>
          <li>• Save to update</li>
        </ul>
      </div>
    </div>
  );
}
