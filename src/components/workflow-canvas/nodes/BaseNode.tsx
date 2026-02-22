'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { NodeData } from '../canvas.types';
import { Loader2, AlertCircle } from 'lucide-react';
import { NODE_WIDTH, HANDLE_SIZE, HANDLE_BORDER_WIDTH } from '../canvas.constants';

interface BaseNodeProps extends NodeProps<NodeData> {
  color?: string;
}

export function BaseNode({ data, selected, color = 'bg-white', ...props }: BaseNodeProps) {
  const handleSize = HANDLE_SIZE;
  const handleOffset = -(HANDLE_SIZE / 2);

  return (
    <div
      className={cn(
        'rounded border transition-all',
        'flex flex-col justify-center items-center',
        selected ? 'border-blue-500 shadow-md' : 'border-gray-300',
        data.isExecuting && 'animate-executing-pulse ring-2 ring-blue-400',
        data.hasError && 'border-red-500 ring-2 ring-red-400/30',
        color
      )}
      style={{ width: `${NODE_WIDTH}px`, height: `${NODE_WIDTH}px` }}
    >
      {/* Input Handle */}
      {data.type !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className={cn(
            'border bg-white rounded-full',
            selected ? 'border-blue-500' : 'border-gray-400'
          )}
          style={{
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            borderWidth: `${HANDLE_BORDER_WIDTH}px`,
            left: `${handleOffset}px`
          }}
        />
      )}

      {/* Node Content */}
      <div className="px-3 py-2 text-center w-full">
        {/* Icon */}
        {data.icon && (
          <div className="mb-1 flex justify-center">
            <data.icon className="w-6 h-6" />
          </div>
        )}

        {/* Label */}
        <div className="font-medium text-xs truncate text-gray-900 px-1">{data.label}</div>

        {/* Status Indicators */}
        <div className="flex items-center justify-center gap-1 mt-1">
          {data.isExecuting && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          )}
          {data.hasError && (
            <AlertCircle className="w-3 h-3 text-red-500" />
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          'border bg-white rounded-full',
          selected ? 'border-blue-500' : 'border-gray-400'
        )}
        style={{
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          borderWidth: `${HANDLE_BORDER_WIDTH}px`,
          right: `${handleOffset}px`
        }}
      />
    </div>
  );
}
