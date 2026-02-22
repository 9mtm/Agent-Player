'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { NodeData } from '../canvas.types';
import { NODE_WIDTH, NODE_HEIGHT, HANDLE_SIZE } from '../canvas.constants';
import { Loader2, AlertCircle } from 'lucide-react';

export function LoopNode({ data, selected }: NodeProps<NodeData>) {
  const handleSize = HANDLE_SIZE;
  const handleOffset = -(HANDLE_SIZE / 2);

  return (
    <div
      className={cn(
        'rounded border-2 transition-all',
        'flex flex-col justify-center items-center',
        'bg-purple-50',
        selected ? 'border-purple-500 shadow-lg' : 'border-purple-400',
        data.isExecuting && 'animate-executing-pulse ring-2 ring-purple-400',
        data.hasError && 'border-red-500 ring-2 ring-red-400/30'
      )}
      style={{ width: `${NODE_WIDTH}px`, height: `${NODE_HEIGHT}px` }}
    >
      {/* Icon */}
      {data.icon && (
        <div className="text-2xl mb-1 text-purple-700">{data.icon}</div>
      )}

      {/* Label */}
      <div className="font-semibold text-xs text-center px-2 text-purple-700">
        {data.label}
      </div>

      {/* Loop indicator badge */}
      <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
        ∞
      </div>

      {/* Status Indicators */}
      {(data.isExecuting || data.hasError) && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow">
          {data.isExecuting && (
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
          )}
          {data.hasError && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
      )}

      {/* Input Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-purple-500' : 'border-purple-400'
        )}
        style={{
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          left: `${handleOffset}px`,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Output Handle (Right) - for next node */}
      <Handle
        type="source"
        position={Position.Right}
        id="next"
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-purple-500' : 'border-purple-400'
        )}
        style={{
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          right: `${handleOffset}px`,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Loop back Handle (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop"
        className={cn(
          'border-2 bg-white rounded-full',
          selected ? 'border-purple-500' : 'border-purple-400'
        )}
        style={{
          width: `${handleSize}px`,
          height: `${handleSize}px`,
          bottom: `${handleOffset}px`,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
}
